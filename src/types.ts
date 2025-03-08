export interface YAPIInterface {
  _id: number;
  title: string;
  path: string;
  method: string;
  project_id: number;
  res_body_type: string;
  req_body_type: string;
  req_body_other?: string;
  res_body?: string;
  req_query?: YAPIParameter[];
  req_params?: YAPIParameter[];
  req_headers?: YAPIParameter[];
  req_body_form?: YAPIParameter[];
}

export interface YAPIParameter {
  name: string;
  desc?: string;
  required?: string | boolean;
  type?: string;
  example?: string;
  _id?: number;
}

export interface YAPIResponse<T = any> {
  errcode: number;
  errmsg: string;
  data: T;
} 