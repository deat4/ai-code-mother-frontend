# 后端修复报告：代码生成类型枚举问题

## 问题描述

前端创建应用时，后端返回错误：

```json
{
  "code": 40000,
  "data": null,
  "message": "不支持的代码生成类型: MULTI_FILE，仅支持 HTML 和 MULTI_FILE"
}
```

错误消息自相矛盾：提示不支持 `MULTI_FILE`，但又说仅支持 `HTML` 和 `MULTI_FILE`。

## 问题分析

后端在验证 `codeGenType` 时混淆了**枚举名称**和**枚举值**。

### Java 枚举示例

```java
public enum CodeGenTypeEnum {
    HTML("html"),          // 枚举名称: HTML, 枚举值: "html"
    MULTI_FILE("multi_file"), // 枚举名称: MULTI_FILE, 枚举值: "multi_file"
    VUE_PROJECT("vue_project");

    private final String value;

    CodeGenTypeEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
```

### 问题原因

后端验证逻辑可能在比较枚举**名称**而不是**值**：

```java
// 错误的方式：直接比较字符串与枚举名称
if (!codeGenType.equals("HTML") && !codeGenType.equals("MULTI_FILE")) {
    // 这里期望的是大写的枚举名称
}

// 或者错误的枚举值获取方式
CodeGenTypeEnum.valueOf(codeGenType);  // 这是用名称查找，需要大写
```

## 解决方案

### 方案 A：前端发送大写枚举名称（已采用）

前端修改为发送大写的枚举名称：

```typescript
// src/constants/codeGenType.ts
export enum CodeGenTypeEnum {
  HTML = 'HTML',
  MULTI_FILE = 'MULTI_FILE',
  VUE_PROJECT = 'VUE_PROJECT',
}
```

后端保持现有验证逻辑不变，使用 `CodeGenTypeEnum.valueOf(codeGenType)` 验证。

**优点**：前端快速修复，无需后端改动
**缺点**：枚举名称和值的语义混淆，不符合常规设计

### 方案 B：后端修复验证逻辑（推荐）

后端应该正确比较枚举值：

```java
// 正确的方式：通过值查找枚举
public static CodeGenTypeEnum fromValue(String value) {
    for (CodeGenTypeEnum type : CodeGenTypeEnum.values()) {
        if (type.getValue().equals(value)) {
            return type;
        }
    }
    return null;
}

// 验证逻辑
CodeGenTypeEnum type = CodeGenTypeEnum.fromValue(codeGenType);
if (type == null) {
    throw new BusinessException("不支持的代码生成类型: " + codeGenType
        + "，仅支持: html, multi_file, vue_project");
}
```

## 预览功能问题（附加）

### 问题描述

Vue 项目预览时请求 `/src/main.js` 返回 404，应该请求 `dist/` 目录下的构建产物。

### 原因分析

1. 后端返回的是源码目录的 `index.html`（引用 `/src/main.js`）
2. 应该返回 `dist/index.html`（引用 `./assets/xxx.js`）

### 修复建议

1. **确保构建执行**：生成代码后执行 `npm run build`
2. **返回正确目录**：预览时返回 `dist/` 目录内容
3. **Vite 配置相对路径**：

```javascript
// vite.config.js
export default defineConfig({
  base: './', // 使用相对路径
  // ...
})
```

4. **AppVO 添加 previewUrl 字段**（已在前端类型中添加）：

```java
public class AppVO {
    // ... 其他字段
    private String previewUrl; // 预览 URL

    // 在 AppServiceImpl.getAppVO() 中设置
    appVO.setPreviewUrl(previewConfig.getHost() + "/vue_project_" + app.getId() + "/");
}
```

## 前端已修改的文件

| 文件                           | 修改内容                            |
| ------------------------------ | ----------------------------------- |
| `src/constants/codeGenType.ts` | 枚举值改为大写                      |
| `src/views/AppManagePage.vue`  | 下拉选项值改为大写                  |
| `src/api/typings.d.ts`         | 添加 `previewUrl`、`appDesc` 等字段 |

## 总结

1. **紧急修复**：前端已改为发送大写枚举名称，后端无需改动即可正常工作
2. **长期建议**：后端应修复枚举验证逻辑，明确区分枚举名称和枚举值
3. **预览问题**：后端需确保 Vue 项目正确构建并返回 `dist/` 目录内容
