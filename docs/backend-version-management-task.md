# 应用版本化管理功能 - 后端开发任务书

## 一、功能概述

为 AI 代码生成平台实现应用版本化管理功能，允许用户追踪应用的迭代历史、查看版本差异、回退到历史版本。

### 核心需求

1. **版本自动管理**：每次 AI 生成新代码时自动创建新版本
2. **版本历史查看**：用户可以查看应用的所有历史版本
3. **版本对比**：可视化显示两个版本之间的代码差异
4. **版本回退**：支持回退到任意历史版本

---

## 二、数据库设计

### 2.1 应用版本表 (app_version)

```sql
CREATE TABLE `app_version` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '版本 ID',
  `app_id` bigint(20) NOT NULL COMMENT '应用 ID',
  `version_number` int(11) NOT NULL COMMENT '版本号 (从 1 开始)',
  `version_name` varchar(100) DEFAULT NULL COMMENT '版本名称',
  `content` longtext NOT NULL COMMENT '完整代码内容',
  `summary` varchar(500) DEFAULT NULL COMMENT '版本摘要/变更说明',
  `change_type` varchar(20) NOT NULL DEFAULT 'UPDATE' COMMENT '变更类型：CREATE/UPDATE/ROLLBACK',
  `diff_summary` varchar(500) DEFAULT NULL COMMENT '与上一版本的差异摘要',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `created_by` bigint(20) DEFAULT NULL COMMENT '创建者用户 ID',
  `is_current` tinyint(1) DEFAULT 0 COMMENT '是否为当前版本',
  `parent_version` int(11) DEFAULT NULL COMMENT '父版本号',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_version` (`app_id`, `version_number`),
  KEY `idx_app_id` (`app_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用版本表';
```

### 2.2 更新现有应用表 (app)

```sql
ALTER TABLE `app`
ADD COLUMN `current_version` int(11) DEFAULT 1 COMMENT '当前版本号',
ADD COLUMN `total_versions` int(11) DEFAULT 1 COMMENT '总版本数',
ADD COLUMN `latest_version_time` datetime DEFAULT NULL COMMENT '最新版本时间';
```

---

## 三、API 接口设计

### 3.1 获取应用版本列表

**接口**: `POST /app/version/list/page`

**请求参数**:

```java
public class AppVersionQueryRequest {
    private Long current;        // 当前页码
    private Long pageSize;       // 每页大小
    private Long appId;          // 应用 ID
    private Integer versionNumber; // 版本号（可选过滤）
}
```

**响应数据**:

```java
public class AppVersionVO {
    private Long id;
    private Long appId;
    private Integer versionNumber;
    private String versionName;
    private String summary;
    private String changeType;     // CREATE/UPDATE/ROLLBACK
    private String diffSummary;
    private Date createdAt;
    private Long createdBy;
    private String creatorName;    // 创建者姓名
    private Boolean isCurrent;     // 是否为当前版本
}
```

---

### 3.2 获取版本详情

**接口**: `GET /app/version/get/detail`

**请求参数**:

```
versionId: Long (版本 ID)
```

**响应数据**:

```java
public class AppVersionDetailVO extends AppVersionVO {
    private String content;        // 完整代码内容
    private UserVO creator;        // 创建者信息
    private Boolean canRollback;   // 是否可回退
    private Integer prevVersion;   // 上一个版本号
    private Integer nextVersion;   // 下一个版本号
}
```

---

### 3.3 创建新版本

**接口**: `POST /app/version/create`

**请求参数**:

```java
public class AppVersionCreateRequest {
    private Long appId;
    private String content;        // 代码内容
    private String versionName;    // 版本名称（可选，自动生成）
    private String summary;        // 变更说明
    private String changeType;     // CREATE/UPDATE/ROLLBACK
}
```

**响应数据**:

```java
public class BaseResponse<Long> {
    private Integer code;
    private Long data;             // 新版本 ID
    private String message;
}
```

**业务逻辑**:

1. 查询应用的当前版本号
2. 新版本号 = 当前版本号 + 1
3. 计算与上一版本的差异（diff）
4. 保存新版本记录
5. 更新应用表的 current_version、total_versions、latest_version_time
6. 如果是回退操作，需要特殊处理

---

### 3.4 对比两个版本

**接口**: `GET /app/version/diff`

**请求参数**:

```
appId: Long
oldVersion: Integer
newVersion: Integer
```

**响应数据**:

```java
public class VersionDiffVO {
    private Integer oldVersion;
    private Integer newVersion;
    private String oldContent;
    private String newContent;
    private String diffHtml;       // 带 HTML 标记的差异
    private DiffStats stats;       // 差异统计
}

public class DiffStats {
    private Integer additions;     // 新增行数
    private Integer deletions;     // 删除行数
    private Integer changes;       // 修改行数
    private Integer totalLines;    // 总行数
}
```

**业务逻辑**:

1. 查询两个版本的代码内容
2. 使用 diff 工具计算差异（推荐：java-diff-utils）
3. 生成带 HTML 标记的差异结果（红色=删除，绿色=新增）
4. 统计差异数据

---

### 3.5 回退到指定版本

**接口**: `POST /app/version/rollback`

**请求参数**:

```java
public class AppVersionRollbackRequest {
    private Long appId;
    private Integer targetVersion;  // 目标版本号
}
```

**响应数据**:

```java
public class BaseResponse<Long> {
    private Integer code;
    private Long data;             // 新创建的版本 ID
    private String message;
}
```

**业务逻辑**:

1. 验证目标版本是否存在
2. 获取目标版本的代码内容
3. 创建一个新的版本记录（change_type = 'ROLLBACK'）
4. 复制目标版本的代码内容
5. 更新应用的当前版本信息

---

### 3.6 获取当前版本内容

**接口**: `GET /app/version/current/content`

**请求参数**:

```
appId: Long
```

**响应数据**:

```java
public class BaseResponse<String> {
    private Integer code;
    private String data;           // 代码内容
    private String message;
}
```

---

## 四、核心业务逻辑

### 4.1 自动生成版本

**时机**: 每次 AI 生成代码成功后

**流程**:

```java
// 在 AI 生成代码的 Service 中调用
public void createAppVersion(Long appId, String content, String prompt) {
    // 1. 查询当前版本
    App app = appMapper.selectById(appId);
    Integer currentVersion = app.getCurrentVersion();

    // 2. 创建新版本
    AppVersion version = new AppVersion();
    version.setAppId(appId);
    version.setVersionNumber(currentVersion + 1);
    version.setVersionName("v" + (currentVersion + 1));
    version.setContent(content);
    version.setSummary("AI 生成：" + prompt.substring(0, 50) + "...");
    version.setChangeType("UPDATE");
    version.setCreatedBy(getCurrentUserId());
    version.setIsCurrent(1);

    // 3. 保存版本
    appVersionMapper.insert(version);

    // 4. 更新应用信息
    app.setCurrentVersion(currentVersion + 1);
    app.setTotalVersions(currentVersion + 1);
    app.setLatestVersionTime(new Date());
    appMapper.updateById(app);
}
```

### 4.2 版本差异计算

**依赖**: 添加 java-diff-utils 依赖

```xml
<dependency>
    <groupId>io.github.java-diff-utils</groupId>
    <artifactId>java-diff-utils</artifactId>
    <version>4.12</version>
</dependency>
```

**实现**:

```java
public class DiffUtils {

    public static DiffResult diff(String oldContent, String newContent) {
        List<String> oldLines = Arrays.asList(oldContent.split("\n"));
        List<String> newLines = Arrays.asList(newContent.split("\n"));

        Patch<String> patch = DiffUtils.diff(oldLines, newLines);

        // 统计
        int additions = 0;
        int deletions = 0;

        for (Delta<String> delta : patch.getDeltas()) {
            if (delta.getType() == DeltaType.CHANGE) {
                additions += delta.getTarget().size();
                deletions += delta.getSource().size();
            } else if (delta.getType() == DeltaType.INSERT) {
                additions += delta.getTarget().size();
            } else if (delta.getType() == DeltaType.DELETE) {
                deletions += delta.getSource().size();
            }
        }

        return new DiffResult(additions, deletions);
    }

    public static String generateDiffHtml(String oldContent, String newContent) {
        // 生成带 HTML 标记的差异
        // 删除的行：<div class="diff-removed">...</div>
        // 新增的行：<div class="diff-added">...</div>
        // 使用 DiffUtils 库计算差异后生成 HTML
    }
}
```

### 4.3 版本回退

```java
@Transactional
public Long rollbackToVersion(Long appId, Integer targetVersion) {
    // 1. 查询目标版本
    AppVersion target = appVersionMapper.selectOne(
        new LambdaQueryWrapper<AppVersion>()
            .eq(AppVersion::getAppId, appId)
            .eq(AppVersion::getVersionNumber, targetVersion)
    );

    if (target == null) {
        throw new BusinessException("目标版本不存在");
    }

    // 2. 查询当前应用信息
    App app = appMapper.selectById(appId);

    // 3. 创建新版本（回退版本）
    AppVersion newVersion = new AppVersion();
    newVersion.setAppId(appId);
    newVersion.setVersionNumber(app.getCurrentVersion() + 1);
    newVersion.setVersionName("v" + (app.getCurrentVersion() + 1));
    newVersion.setContent(target.getContent());
    newVersion.setSummary("回退到版本 v" + targetVersion);
    newVersion.setChangeType("ROLLBACK");
    newVersion.setParentVersion(targetVersion);
    newVersion.setCreatedBy(getCurrentUserId());
    newVersion.setIsCurrent(1);

    appVersionMapper.insert(newVersion);

    // 4. 更新应用信息
    app.setCurrentVersion(app.getCurrentVersion() + 1);
    app.setTotalVersions(app.getTotalVersions() + 1);
    app.setLatestVersionTime(new Date());
    appMapper.updateById(app);

    return newVersion.getId();
}
```

---

## 五、前端集成要点

### 5.1 版本列表展示

前端会在应用详情弹窗中显示：

- 当前版本号（标签形式）
- 总版本数
- "版本历史"按钮

### 5.2 版本对比展示

前端会弹出一个模态框，显示：

- 左右两栏代码对比
- 红色背景 = 删除的行
- 绿色背景 = 新增的行
- 差异统计信息

### 5.3 版本回退确认

前端会弹出确认对话框：

```
确认回退到版本 v3 吗？

回退后将创建新版本 v6，当前版本 v5 的变更将丢失。

[取消] [确认回退]
```

---

## 六、性能优化建议

### 6.1 大文件存储

- 代码内容超过 1MB 时，建议存储到文件系统，数据库只存路径
- 使用压缩算法（如 gzip）存储历史版本

### 6.2 差异计算优化

- 差异计算耗时较长，建议使用异步任务
- 缓存常用版本对比结果（Redis）

### 6.3 分页查询

- 版本列表默认分页（每页 10 条）
- 支持按版本号、创建时间排序

---

## 七、测试用例

### 7.1 单元测试

- [ ] 创建版本 - 版本号自动递增
- [ ] 版本对比 - 差异计算准确
- [ ] 版本回退 - 回退后版本号正确
- [ ] 边界条件 - 第一个版本、最大版本号

### 7.2 集成测试

- [ ] AI 生成代码后自动创建版本
- [ ] 回退后可以再次回退
- [ ] 版本列表分页查询
- [ ] 并发创建版本（乐观锁）

---

## 八、安全考虑

### 8.1 权限控制

- 只有应用所有者才能查看版本历史
- 只有应用所有者才能回退版本
- 管理员可以查看所有版本

### 8.2 数据验证

- 验证 appId 和 versionNumber 的有效性
- 防止 SQL 注入（使用 MyBatis Plus）
- 限制版本内容大小（防止 DoS 攻击）

---

## 九、开发计划

### 第一阶段（2 天）

- [ ] 数据库表设计和创建
- [ ] 实体类和 Mapper 编写
- [ ] 基础的 CRUD 接口

### 第二阶段（2 天）

- [ ] 版本创建逻辑（集成到 AI 生成流程）
- [ ] 版本对比功能（集成 java-diff-utils）
- [ ] 版本回退功能

### 第三阶段（1 天）

- [ ] 单元测试和集成测试
- [ ] 性能优化
- [ ] 与前端联调

---

## 十、常见问题

### Q1: 版本号是全局唯一还是每个应用独立？

**A**: 每个应用独立，从 v1 开始递增。

### Q2: 删除应用时，版本数据如何处理？

**A**: 级联删除（设置外键 ON DELETE CASCADE）

### Q3: 版本内容太大，数据库存储有压力怎么办？

**A**: 使用文件系统存储，数据库只存路径。

### Q4: 是否需要支持版本分支？

**A**: 第一版不支持，后续可以根据需求扩展。

### Q5: 回退版本后，被跳过的版本还能访问吗？

**A**: 可以，所有历史版本都会保留。

---

## 联系人

- **前端开发**: [你的名字]
- **后端开发**: [待分配]
- **项目负责人**: [待分配]

**文档版本**: v1.0  
**创建时间**: 2026-03-08  
**最后更新**: 2026-03-08
