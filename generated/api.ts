// 自动生成的API请求文件
import axios from 'axios';
import { AxiosRequestConfig } from 'axios';
import type {
  AfterSalesServiceAfterSalesV1CompleteAfterSalesOrderPostRequest,
  AfterSalesServiceAfterSalesV1CompleteAfterSalesOrderPostResponse,
} from './types';

export async function postafterSalesServiceAfterSalesV1CompleteAfterSalesOrder(
  params: AfterSalesServiceAfterSalesV1CompleteAfterSalesOrderPostRequest,
  config?: AxiosRequestConfig
): Promise<AfterSalesServiceAfterSalesV1CompleteAfterSalesOrderPostResponse> {
  const response = await axios.post<AfterSalesServiceAfterSalesV1CompleteAfterSalesOrderPostResponse>(
    `/after-sales-service/afterSales/v1/completeAfterSalesOrder`,
    params,
    config
  );
  return response.data;
}

