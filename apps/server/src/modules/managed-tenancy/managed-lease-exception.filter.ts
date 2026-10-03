import {ArgumentsHost,Catch,ExceptionFilter,HttpException} from "@nestjs/common";
import {Response} from "express";

/** 专用实例不把 Prisma 参数、连接地址或供应商正文写入错误响应或日志。 */
@Catch()
export class ManagedLeaseExceptionFilter implements ExceptionFilter{
  catch(error:unknown,host:ArgumentsHost){
    const response=host.switchToHttp().getResponse<Response>();
    if(error instanceof HttpException){response.status(error.getStatus()).json(error.getResponse());return;}
    const failure=error as {code?:string;meta?:{code?:string;database_error?:string};message?:string};
    const unavailable=failure?.meta?.code==='55000'||failure?.code==='P2034'||String(failure?.meta?.database_error||failure?.message||'').includes('managed write fence');
    response.status(unavailable?503:500).json({statusCode:unavailable?503:500,message:unavailable?'实例正在维护或写入状态已变化，请稍后核对已有请求结果':'操作未完成，请联系客户维护人员核对请求记录'});
  }
}
