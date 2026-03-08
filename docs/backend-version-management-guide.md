# 应用版本化管理 - 后端开发指导书

## 快速开始指南

### 第一步：数据库迁移（15 分钟）

```sql
-- 1. 创建版本表
CREATE TABLE `app_version` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `app_id` bigint(20) NOT NULL,
  `version_number` int(11) NOT NULL,
  `version_name` varchar(100) DEFAULT NULL,
  `content` longtext NOT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `change_type` varchar(20) NOT NULL DEFAULT 'UPDATE',
  `diff_summary` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint(20) DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT 0,
  `parent_version` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_version` (`app_id`, `version_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 更新应用表
ALTER TABLE `app`
ADD COLUMN `current_version` int(11) DEFAULT 1,
ADD COLUMN `total_versions` int(11) DEFAULT 1,
ADD COLUMN `latest_version_time` datetime DEFAULT NULL;
```

### 第二步：添加依赖（5 分钟）

在 `pom.xml` 中添加：

```xml
<!-- 版本差异计算 -->
<dependency>
    <groupId>io.github.java-diff-utils</groupId>
    <artifactId>java-diff-utils</artifactId>
    <version>4.12</version>
</dependency>
```

### 第三步：创建实体类（30 分钟）

```java
@TableName("app_version")
@Data
public class AppVersion {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long appId;
    private Integer versionNumber;
    private String versionName;

    @TableField(exist = false)  // 大字段可选
    private String content;

    private String summary;
    private String changeType;  // CREATE, UPDATE, ROLLBACK
    private String diffSummary;
    private Date createdAt;
    private Long createdBy;
    private Integer isCurrent;
    private Integer parentVersion;
}
```

### 第四步：实现核心 Service（2 小时）

```java
@Service
public class AppVersionService {

    @Autowired
    private AppVersionMapper versionMapper;

    @Autowired
    private AppMapper appMapper;

    /**
     * 创建新版本（AI 生成后自动调用）
     */
    @Transactional
    public Long createVersion(AppVersionCreateRequest request) {
        // 1. 查询当前版本
        App app = appMapper.selectById(request.getAppId());
        Integer currentVersion = Optional.ofNullable(app.getCurrentVersion()).orElse(0);

        // 2. 计算差异
        String oldContent = getCurrentVersionContent(app.getId());
        String diffSummary = DiffUtils.calculateDiffSummary(oldContent, request.getContent());

        // 3. 创建新版本
        AppVersion version = new AppVersion();
        version.setAppId(request.getAppId());
        version.setVersionNumber(currentVersion + 1);
        version.setVersionName("v" + (currentVersion + 1));
        version.setContent(request.getContent());
        version.setSummary(request.getSummary());
        version.setChangeType(request.getChangeType());
        version.setDiffSummary(diffSummary);
        version.setCreatedBy(UserHolder.getUserId());
        version.setIsCurrent(1);

        versionMapper.insert(version);

        // 4. 更新应用信息
        app.setCurrentVersion(currentVersion + 1);
        app.setTotalVersions(currentVersion + 1);
        app.setLatestVersionTime(new Date());
        appMapper.updateById(app);

        return version.getId();
    }

    /**
     * 版本对比
     */
    public VersionDiffVO diffVersions(Long appId, Integer oldVersion, Integer newVersion) {
        // 查询两个版本
        AppVersion oldV = getVersion(appId, oldVersion);
        AppVersion newV = getVersion(appId, newVersion);

        // 计算差异
        DiffResult diff = DiffUtils.diff(oldV.getContent(), newV.getContent());

        VersionDiffVO result = new VersionDiffVO();
        result.setOldVersion(oldVersion);
        result.setNewVersion(newVersion);
        result.setOldContent(oldV.getContent());
        result.setNewContent(newV.getContent());
        result.setDiffHtml(diff.getHtml());
        result.setStats(diff.getStats());

        return result;
    }

    /**
     * 回退版本
     */
    @Transactional
    public Long rollback(Long appId, Integer targetVersion) {
        AppVersion target = getVersion(appId, targetVersion);
        App app = appMapper.selectById(appId);

        // 创建回退版本
        AppVersion newVersion = new AppVersion();
        newVersion.setAppId(appId);
        newVersion.setVersionNumber(app.getCurrentVersion() + 1);
        newVersion.setContent(target.getContent());
        newVersion.setSummary("回退到版本 v" + targetVersion);
        newVersion.setChangeType("ROLLBACK");
        newVersion.setParentVersion(targetVersion);

        versionMapper.insert(newVersion);

        // 更新应用
        app.setCurrentVersion(app.getCurrentVersion() + 1);
        app.setTotalVersions(app.getTotalVersions() + 1);
        appMapper.updateById(app);

        return newVersion.getId();
    }
}
```

### 第五步：实现 Controller（1 小时）

```java
@RestController
@RequestMapping("/app/version")
public class AppVersionController {

    @Autowired
    private AppVersionService versionService;

    @PostMapping("/list/page")
    public BaseResponse<Page<AppVersionVO>> listVersions(@RequestBody AppVersionQueryRequest request) {
        // 实现分页查询
    }

    @GetMapping("/get/detail")
    public BaseResponse<AppVersionDetailVO> getVersionDetail(@RequestParam Long versionId) {
        // 实现详情查询
    }

    @PostMapping("/create")
    public BaseResponse<Long> createVersion(@RequestBody AppVersionCreateRequest request) {
        Long id = versionService.createVersion(request);
        return ResultUtils.success(id);
    }

    @GetMapping("/diff")
    public BaseResponse<VersionDiffVO> diffVersions(
            @RequestParam Long appId,
            @RequestParam Integer oldVersion,
            @RequestParam Integer newVersion) {
        VersionDiffVO result = versionService.diffVersions(appId, oldVersion, newVersion);
        return ResultUtils.success(result);
    }

    @PostMapping("/rollback")
    public BaseResponse<Long> rollback(@RequestBody AppVersionRollbackRequest request) {
        Long id = versionService.rollback(request.getAppId(), request.getTargetVersion());
        return ResultUtils.success(id);
    }
}
```

### 第六步：集成到 AI 生成流程（30 分钟）

在现有的 AI 生成代码 Service 中：

```java
@Service
public class AppGenerationService {

    @Autowired
    private AppVersionService versionService;

    public GenerateResult generate(String prompt, Long appId) {
        // 1. 调用 AI 生成代码
        String code = aiService.generate(prompt);

        // 2. 创建新版本
        AppVersionCreateRequest request = new AppVersionCreateRequest();
        request.setAppId(appId);
        request.setContent(code);
        request.setSummary("AI 生成：" + truncate(prompt, 50));
        request.setChangeType("UPDATE");

        versionService.createVersion(request);

        // 3. 返回结果
        return new GenerateResult(code);
    }
}
```

### 第七步：测试（1 小时）

```java
@SpringBootTest
public class AppVersionServiceTest {

    @Autowired
    private AppVersionService versionService;

    @Test
    public void testCreateVersion() {
        // 测试创建版本
        AppVersionCreateRequest request = new AppVersionCreateRequest();
        request.setAppId(1L);
        request.setContent("<html>...</html>");

        Long id = versionService.createVersion(request);
        assertNotNull(id);
    }

    @Test
    public void testDiffVersions() {
        // 测试版本对比
        VersionDiffVO diff = versionService.diffVersions(1L, 1, 2);
        assertNotNull(diff.getDiffHtml());
    }

    @Test
    public void testRollback() {
        // 测试版本回退
        Long newId = versionService.rollback(1L, 1);
        assertNotNull(newId);
    }
}
```

---

## 关键实现细节

### 1. 差异计算工具类

```java
public class DiffUtils {

    public static DiffResult diff(String oldContent, String newContent) {
        List<String> oldLines = splitLines(oldContent);
        List<String> newLines = splitLines(newContent);

        Patch<String> patch = DiffUtils.diff(oldLines, newLines);

        int additions = 0;
        int deletions = 0;
        StringBuilder html = new StringBuilder();

        for (Delta<String> delta : patch.getDeltas()) {
            processDelta(delta, html, additions, deletions);
        }

        return new DiffResult(additions, deletions, html.toString());
    }

    private static void processDelta(Delta<String> delta, StringBuilder html,
                                    int additions, int deletions) {
        switch (delta.getType()) {
            case DELETE:
                deletions += delta.getSource().size();
                for (String line : delta.getSource()) {
                    html.append("<div class='diff-removed'>").append(line).append("</div>");
                }
                break;
            case INSERT:
                additions += delta.getTarget().size();
                for (String line : delta.getTarget()) {
                    html.append("<div class='diff-added'>").append(line).append("</div>");
                }
                break;
            case CHANGE:
                // 处理变更
                break;
        }
    }
}
```

### 2. 大文件存储策略

```java
@Service
public class VersionContentStorage {

    @Value("${version.storage.path:/data/versions}")
    private String storagePath;

    public String saveContent(Long appId, Integer version, String content) {
        if (content.length() > 1024 * 1024) {  // > 1MB
            // 存储到文件
            String filePath = getFilePath(appId, version);
            FileUtils.writeStringToFile(new File(filePath), content, StandardCharsets.UTF_8);
            return "file:" + filePath;  // 返回文件路径标记
        } else {
            return content;  // 直接存储
        }
    }

    public String getContent(String contentRef) {
        if (contentRef.startsWith("file:")) {
            String filePath = contentRef.substring(5);
            return FileUtils.readFileToString(new File(filePath), StandardCharsets.UTF_8);
        }
        return contentRef;
    }
}
```

---

## 调试技巧

### 1. 查看版本创建日志

```java
@Slf4j
public class AppVersionService {

    public Long createVersion(AppVersionCreateRequest request) {
        log.info("创建版本：appId={}, contentLength={}",
                 request.getAppId(),
                 request.getContent().length());

        // ... 业务逻辑

        log.info("版本创建成功：versionId={}, versionNumber={}",
                 version.getId(),
                 version.getVersionNumber());

        return version.getId();
    }
}
```

### 2. 性能监控

```java
@Aspect
@Component
public class VersionPerformanceMonitor {

    @Around("execution(* com.example.service.AppVersionService.*(..))")
    public Object monitor(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = pjp.proceed();
        long duration = System.currentTimeMillis() - start;

        log.info("方法 {} 执行时间：{}ms", pjp.getSignature().getName(), duration);

        if (duration > 1000) {
            log.warn("方法 {} 执行时间过长：{}ms", pjp.getSignature().getName(), duration);
        }

        return result;
    }
}
```

---

## 联调步骤

### 1. 本地开发环境

**前端配置** (`src/utils/request.ts`):

```typescript
const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: 'http://localhost:8123/api', // 后端地址
  // ...
}
```

**后端配置** (`application.yml`):

```yaml
server:
  port: 8123

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ai_code_mother
    username: root
    password: xxx
```

### 2. 测试流程

1. **启动后端**: `mvn spring-boot:run`
2. **启动前端**: `npm run dev`
3. **访问页面**: http://localhost:5173
4. **创建应用**: 输入提示词，点击生成
5. **查看版本**: 点击应用详情 → 版本历史
6. **对比版本**: 选择版本，点击对比
7. **回退版本**: 点击回退按钮

### 3. 常见问题排查

**问题 1**: 前端调用接口 404

```
检查点：
- 后端是否启动成功
- 接口路径是否正确（/app/version/...）
- 网关/代理配置是否正确
```

**问题 2**: 版本创建失败

```
检查点：
- 数据库连接是否正常
- app_id 是否存在
- content 字段是否过大
```

**问题 3**: 版本对比加载慢

```
检查点：
- 代码内容是否过大（>1MB）
- 差异计算是否耗时（添加日志）
- 考虑使用异步加载
```

---

## 验收标准

- [ ] 创建应用后自动保存版本
- [ ] 可以查看版本历史列表
- [ ] 可以对比任意两个版本
- [ ] 可以回退到历史版本
- [ ] 版本号正确递增
- [ ] 权限控制正常（只能操作自己的应用）
- [ ] 性能达标（版本对比 < 3 秒）

---

## 后续优化方向

1. **版本标签**: 支持用户给版本打标签（如"稳定版"、"测试版"）
2. **版本备注**: 支持用户手动添加版本备注
3. **版本恢复**: 支持从回收站恢复已删除的版本
4. **版本导出**: 支持导出特定版本的代码
5. **版本比较增强**: 支持多版本对比、时间线视图

---

**文档版本**: v1.0  
**创建时间**: 2026-03-08  
**技术支持**: 前端团队
