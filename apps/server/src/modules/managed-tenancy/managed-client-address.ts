import {BadRequestException} from "@nestjs/common";
import {isIP} from "net";
import {Request} from "express";

/** 统一IPv6写法及IPv4映射，防止同一来源靠不同文本分散限流计数。 */
function address(value:string){
  if(isIP(value)===4)return value;
  if(isIP(value)!==6)throw new Error("连接地址无效");
  const canonical=new URL(`http://[${value}]/`).hostname.slice(1,-1);
  const mapped=/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(canonical);
  if(!mapped)return canonical;
  const high=parseInt(mapped[1],16),low=parseInt(mapped[2],16);
  return [high>>8,high&255,low>>8,low&255].join(".");
}

/** 仅逐个维护配置的代理IP可信，禁止通配、CIDR、跳数和客户端自选代理。 */
export function managedClientAddressResolver(value:unknown){
  if(value!==undefined&&(!Array.isArray(value)||value.length>8||value.some(item=>typeof item!=="string"||item!==item.trim())))throw new Error("客户可信代理配置无效");
  const entries=(value??[]) as string[],trusted=new Set(entries.map(address));
  if(trusted.size!==entries.length)throw new Error("客户可信代理配置存在重复地址");
  return (request:Request)=>{
    let peer:string;
    try{peer=address(request.socket.remoteAddress||"");}catch{throw new BadRequestException("连接来源无效");}
    if(!trusted.has(peer))return peer;
    const header=request.headers["x-forwarded-for"];
    if(typeof header!=="string"||header.length>1024)throw new BadRequestException("可信代理须提供受限的连接来源链");
    const chain=header.split(",").map(part=>part.trim());
    if(!chain.length||chain.length>16)throw new BadRequestException("代理连接来源链过长");
    let normalized:string[];
    try{normalized=chain.map(address);}catch{throw new BadRequestException("代理连接来源链无效");}
    // 从最近一跳反向核对，遇首个不可信地址即停止，不信任更左侧客户端自报值。
    for(let i=normalized.length-1;i>=0&&trusted.has(peer);i--)peer=normalized[i];
    return peer;
  };
}
