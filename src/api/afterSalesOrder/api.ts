import axios from 'axios';
import { AfterSalesV1GetAfterSalesOrderDetailListPOSTReq, AfterSalesV1GetAfterSalesOrderDetailListPOSTRes, AfterSalesV1GetAfterSalesOrderDetailPOSTReq, AfterSalesV1GetAfterSalesOrderDetailPOSTRes } from './types';

/**
 * 查询售后明细列表
 * @description /afterSales/v1/getAfterSalesOrderDetailList
 * @method POST
 */
export async function getAfterSalesOrderDetailList(data: AfterSalesV1GetAfterSalesOrderDetailListPOSTReq) {
  const response = await axios.post<AfterSalesV1GetAfterSalesOrderDetailListPOSTRes>('/after-sales-service/afterSales/v1/getAfterSalesOrderDetailList', data);
  return response.data;
}

/**
 * 查询售后单详情-订单信息
 * @description /afterSales/v1/getAfterSalesOrderDetail
 * @method POST
 */
export async function getAfterSalesOrderDetail(params: AfterSalesV1GetAfterSalesOrderDetailPOSTReq) {
  const response = await axios.post<AfterSalesV1GetAfterSalesOrderDetailPOSTRes>('/after-sales-service/afterSales/v1/getAfterSalesOrderDetail', { params });
  return response.data;
}

