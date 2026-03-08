// @ts-ignore
/* eslint-disable */
import request from '@/utils/request'

/** 此处后端没有提供注释 DELETE /app/version/admin/${param0} */
export async function deleteVersion(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteVersionParams,
  options?: { [key: string]: any }
) {
  const { versionId: param0, ...queryParams } = params
  return request<API.BaseResponseBoolean>(`/app/version/admin/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /app/version/create */
export async function createVersion(
  body: API.AppVersionAddRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseLong>('/app/version/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /app/version/current/content */
export async function getCurrentVersionContent(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getCurrentVersionContentParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseString>('/app/version/current/content', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /app/version/detail */
export async function getVersionDetail(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getVersionDetailParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseAppVersionDetailVO>('/app/version/detail', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /app/version/diff */
export async function diffVersions(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.diffVersionsParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseVersionDiffVO>('/app/version/diff', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /app/version/list/page */
export async function listVersionsPage(
  body: API.AppVersionQueryRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePageAppVersionVO>('/app/version/list/page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /app/version/rollback */
export async function rollbackToVersion(
  body: API.AppVersionRollbackRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseLong>('/app/version/rollback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}
