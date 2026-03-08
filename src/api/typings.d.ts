declare namespace API {
  type AppAddRequest = {
    appName?: string
    cover?: string
    initPrompt?: string
    codeGenType?: string
  }

  type AppQueryRequest = {
    current?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    id?: number
    appName?: string
    cover?: string
    initPrompt?: string
    codeGenType?: string
    deployKey?: string
    priority?: number
    userId?: number
  }

  type AppUpdateAdminRequest = {
    id?: number
    appName?: string
    cover?: string
    priority?: number
  }

  type AppUpdateRequest = {
    id?: number
    appName?: string
    cover?: string
    initPrompt?: string
    codeGenType?: string
    priority?: number
  }

  type AppVersionAddRequest = {
    appId?: number
    content?: string
    versionName?: string
    summary?: string
    changeType?: string
    parentVersion?: number
  }

  type AppVersionDetailVO = {
    id?: number
    appId?: number
    versionNumber?: number
    versionName?: string
    summary?: string
    changeType?: string
    diffSummary?: string
    createdAt?: string
    createdBy?: number
    creatorName?: string
    isCurrent?: boolean
    content?: string
    creator?: UserVO
    canRollback?: boolean
    prevVersion?: number
    nextVersion?: number
  }

  type AppVersionQueryRequest = {
    current?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    appId?: number
    versionNumber?: number
  }

  type AppVersionRollbackRequest = {
    appId?: number
    targetVersion?: number
  }

  type AppVersionVO = {
    id?: number
    appId?: number
    versionNumber?: number
    versionName?: string
    summary?: string
    changeType?: string
    diffSummary?: string
    createdAt?: string
    createdBy?: number
    creatorName?: string
    isCurrent?: boolean
  }

  type AppVO = {
    id?: number
    appName?: string
    cover?: string
    initPrompt?: string
    codeGenType?: string
    deployKey?: string
    deployedTime?: string
    priority?: number
    userId?: number
    createTime?: string
    updateTime?: string
    user?: UserVO
  }

  type BaseResponseAppVersionDetailVO = {
    code?: number
    data?: AppVersionDetailVO
    message?: string
  }

  type BaseResponseAppVO = {
    code?: number
    data?: AppVO
    message?: string
  }

  type BaseResponseBoolean = {
    code?: number
    data?: boolean
    message?: string
  }

  type BaseResponseLoginUserVO = {
    code?: number
    data?: LoginUserVO
    message?: string
  }

  type BaseResponseLong = {
    code?: number
    data?: number
    message?: string
  }

  type BaseResponsePageAppVersionVO = {
    code?: number
    data?: PageAppVersionVO
    message?: string
  }

  type BaseResponsePageAppVO = {
    code?: number
    data?: PageAppVO
    message?: string
  }

  type BaseResponsePageChatHistory = {
    code?: number
    data?: PageChatHistory
    message?: string
  }

  type BaseResponsePageUserVO = {
    code?: number
    data?: PageUserVO
    message?: string
  }

  type BaseResponseString = {
    code?: number
    data?: string
    message?: string
  }

  type BaseResponseUser = {
    code?: number
    data?: User
    message?: string
  }

  type BaseResponseUserVO = {
    code?: number
    data?: UserVO
    message?: string
  }

  type BaseResponseVersionDiffVO = {
    code?: number
    data?: VersionDiffVO
    message?: string
  }

  type ChatHistory = {
    id?: number
    parentId?: number
    message?: string
    messageType?: string
    fileList?: string
    appId?: number
    userId?: number
    createTime?: string
    updateTime?: string
    isDelete?: number
  }

  type ChatHistoryAddRequest = {
    parentId?: number
    message?: string
    messageType?: string
    fileList?: string
    appId?: number
  }

  type ChatHistoryQueryRequest = {
    current?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    id?: number
    message?: string
    messageType?: string
    appId?: number
    userId?: number
    lastCreateTime?: string
  }

  type chatToGenCodeParams = {
    appId: number
    message: string
  }

  type deleteChatHistoryParams = {
    id: number
  }

  type DeleteRequest = {
    id?: number
  }

  type deleteVersionParams = {
    versionId: number
  }

  type DiffStats = {
    additions?: number
    deletions?: number
    changes?: number
    totalLines?: number
  }

  type diffVersionsParams = {
    appId: number
    oldVersion: number
    newVersion: number
  }

  type getAppVOByIdByAdminParams = {
    id: number
  }

  type getAppVOByIdParams = {
    id: number
  }

  type getCurrentVersionContentParams = {
    appId: number
  }

  type getUserByIdParams = {
    id: number
  }

  type getUserVOByIdParams = {
    id: number
  }

  type getUserVOByPathIdParams = {
    id: number
  }

  type getVersionDetailParams = {
    versionId: number
  }

  type listAppChatHistoryParams = {
    appId: number
    pageSize?: number
    lastCreateTime?: string
  }

  type LoginUserVO = {
    id?: number
    userAccount?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    createTime?: string
    updateTime?: string
  }

  type PageAppVersionVO = {
    records?: AppVersionVO[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type PageAppVO = {
    records?: AppVO[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type PageChatHistory = {
    records?: ChatHistory[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type PageUserVO = {
    records?: UserVO[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type previewGeneratedCodeParams = {
    codeGenType_appId: string
  }

  type ServerSentEventString = true

  type serveStaticResourceParams = {
    deployKey: string
  }

  type stopGenerationParams = {
    sessionId: string
  }

  type User = {
    id?: number
    userAccount?: string
    userPassword?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    editTime?: string
    createTime?: string
    updateTime?: string
    isDelete?: number
    vipExpireTime?: string
    vipCode?: string
    vipNumber?: number
    shareCode?: string
    inviteUser?: number
  }

  type UserAddRequest = {
    userAccount?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    userPassword?: string
  }

  type UserLoginRequest = {
    userAccount?: string
    userPassword?: string
  }

  type UserQueryRequest = {
    current?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    id?: number
    userAccount?: string
    userName?: string
    userProfile?: string
    userRole?: string
  }

  type UserRegisterRequest = {
    userAccount?: string
    userPassword?: string
    checkPassword?: string
  }

  type UserUpdateRequest = {
    id?: number
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
  }

  type UserVO = {
    id?: number
    userAccount?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    createTime?: string
  }

  type VersionDiffVO = {
    oldVersion?: number
    newVersion?: number
    oldContent?: string
    newContent?: string
    diffHtml?: string
    stats?: DiffStats
  }
}
