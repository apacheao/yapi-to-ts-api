export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTReq {
  /** 售后单id */
  afterSalesOrderId: string;
  /** 是否展示关联明细 */
  merge?: boolean;
}


export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemSkuAbsorbedTax {
  denominator?: number;
  numerator?: number;
}

export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemSkuAbsorbedCost {
  denominator?: number;
  numerator?: number;
}

export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemSkuAbsorbedAndTax {
  denominator?: number;
  numerator?: number;
}

export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemEvidenceInfoListItem {
  /** 证据id */
  evidenceId?: string;
  /** 证据类型 */
  evidenceType?: number;
  /** 证据图片链接地址 */
  imgUrl?: string;
}

export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItem {
  /** 售后单ID */
  afterSalesOrderId: string;
  /** 解决方案集合 */
  afterSalesSolutions: Record<string, any>;
  /** 买家态度 */
  buyerManner?: string;
  /** 车型及OE */
  carModel?: string;
  /** SKU投诉渠道 */
  complaintChannel: number;
  /** 客诉sku编码 */
  complaintSkuCode: string;
  /** 客诉skuId */
  complaintSkuId: string;
  /** 客诉子类型 */
  complaintSubType: number;
  /** 客诉时间 */
  complaintTime: string;
  /** 客诉类型 */
  complaintType: number;
  /** createTime */
  createTime: string;
  /** createdBy */
  createdBy: number;
  /** 币种 */
  currency: string;
  /** 纠纷类型平台 */
  disputeType?: string;
  /** 证据描述 */
  evidenceInfo?: string;
  /** 证据列表集合 */
  evidenceInfoList?: AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemEvidenceInfoListItem[];
  /** 售后明细主键ID */
  id: string;
  /** 是否补发单 */
  isReissueOrder: boolean;
  /** itemId */
  itemId: string;
  /** lastUpdatedBy */
  lastUpdatedBy: number;
  /** listingSku */
  listingSku: string;
  /** makeupPaymentAmount */
  makeupPaymentAmount: number;
  /** makeupPaymentQty */
  makeupPaymentQty: number;
  /** 其它备注 */
  otherRemark?: string;
  /** po批次号PO#（类似工厂批次号） */
  poBatchNo?: string;
  /** 问题描述 */
  problemDesc: string;
  /** 产品状态 */
  productStatus?: string;
  /** 售后数量 */
  qty: number;
  /** 退款数量 */
  refundQty: number;
  /** 备注 */
  remark: string;
  /** 补发数量 */
  resendQty: number;
  /** 退款金额 */
  retAmount: number;
  /** 退货运费人工录入可修改 */
  returnFreight?: number;
  /** 退货运费币种 */
  returnFreightCurrency?: string;
  /** 退货数量 */
  returnQty: number;
  /** 售后单号 */
  salesComplaintNo: string;
  /** 发货明细ID */
  shippingOrderDetailId: string;
  /** 发货单ID */
  shippingOrderId: number;
  /** 发货单号 */
  shippingOrderNo: string;
  skuAbsorbedAndTax?: AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemSkuAbsorbedAndTax;
  skuAbsorbedCost?: AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemSkuAbsorbedCost;
  skuAbsorbedTax?: AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItemSkuAbsorbedTax;
  /** skuCode */
  skuCode: string;
  /** skuId */
  skuId: string;
  /** 物流跟踪号 */
  trackingNo: string;
  /** updateTime */
  updateTime: string;
}

export interface AfterSalesV1GetAfterSalesOrderDetailListPOSTRes {
  data?: AfterSalesV1GetAfterSalesOrderDetailListPOSTResDataItem[];
  empty?: boolean;
  errCode?: string;
  errMessage?: string;
  notEmpty?: boolean;
  success?: boolean;
}


export interface AfterSalesV1GetAfterSalesOrderDetailPOSTReq {
  /** salesOrderId */
  salesOrderId: string | number;
}

export interface AfterSalesV1GetAfterSalesOrderDetailPOSTResData {
  /** 订单投诉次数 */
  afterSalesSequence?: number;
  /** 买家ID */
  buyerId?: string;
  /** 买家收件地址 */
  buyerShippingAddress?: string;
  /** 客诉类型 */
  customerComplaintType?: number;
  /** Email */
  email?: string;
  /** OMS系统单号 */
  omsSystemOrderNumber?: string;
  /** 已付款天数 */
  paidDays?: number;
  /** 付款日期 */
  paymentDate?: string;
  /** 平台 */
  platform?: string;
  /** 售出日期 */
  saleDate?: string;
  /** 销售账号 */
  salesAccount?: string;
  /** 主键 */
  salesOrderId?: number;
  /** 销售平台单号 */
  salesPlatformOrderNumber?: string;
  /** 运费 */
  shippingCost?: number;
  /** 运输方式 */
  shippingMethod?: string;
  /** 发货单号 */
  shippingOrderNumber?: string;
  /** 站点 */
  site?: string;
  /** 总价 */
  totalAmount?: number;
  /** 谷仓订单号 */
  warehouseOrderNumber?: string;
}

export interface AfterSalesV1GetAfterSalesOrderDetailPOSTRes {
  data?: AfterSalesV1GetAfterSalesOrderDetailPOSTResData;
  errCode?: string;
  errMessage?: string;
  success?: boolean;
}


