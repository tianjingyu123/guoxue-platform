import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { MerchantService } from "./merchant.service";
import { SignAgreementDto, CreateAgreementDto, UpdateAgreementDto, PaginationDto } from "./merchant.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class MerchantAgreementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantService: MerchantService,
  ) {}

  async getLatestAgreement() {
    const agreement = await this.prisma.merchantAgreement.findFirst({
      where: { merchantId: "TEMPLATE" },
      orderBy: { createdAt: "desc" },
    });
    if (!agreement) throw new BusinessException(ErrorCode.MERCHANT_AGREEMENT_NOT_SIGNED, "暂无可用的入驻协议");
    return agreement;
  }

  /** 商家签署协议 */
  async signAgreement(userId: string, ipAddress: string, dto: SignAgreementDto) {
    if (!dto.agreed) throw new BusinessException(ErrorCode.MERCHANT_AGREEMENT_NOT_SIGNED, "需要同意协议才能签署");

    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.status !== "AGREEMENT_PENDING") throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "当前状态不可签署协议");

    const template = await this.getLatestAgreement();

    const agreement = await this.prisma.merchantAgreement.create({
      data: {
        merchantId: merchant.id,
        version: dto.version || template.version,
        title: template.title,
        content: template.content,
        signedAt: new Date(),
        ipAddress,
      },
    });

    await this.merchantService.handleAgreementSigned(merchant.id, ipAddress);

    return agreement;
  }

  /** 管理员创建协议模版 */
  async createAgreement(dto: CreateAgreementDto) {
    return this.prisma.merchantAgreement.create({
      data: {
        merchantId: "TEMPLATE",
        version: dto.version,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  /** 管理员更新协议模版 */
  async updateAgreement(id: string, dto: UpdateAgreementDto) {
    const agreement = await this.prisma.merchantAgreement.findUnique({ where: { id } });
    if (!agreement) throw new BusinessException(ErrorCode.NOT_FOUND, "协议不存在");

    return this.prisma.merchantAgreement.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title } : {}),
        ...(dto.content != null ? { content: dto.content } : {}),
      },
    });
  }

  async deleteAgreement(id: string) {
    const agreement = await this.prisma.merchantAgreement.findUnique({ where: { id } });
    if (!agreement) throw new BusinessException(ErrorCode.NOT_FOUND, "协议不存在");
    await this.prisma.merchantAgreement.delete({ where: { id } });
  }

  async listAgreements(query: PaginationDto) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize, NO_PAGE_LIMIT);
    const [list, total] = await Promise.all([
      this.prisma.merchantAgreement.findMany({
        where: { merchantId: "TEMPLATE" },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.merchantAgreement.count({ where: { merchantId: "TEMPLATE" } }),
    ]);
    return { list, total, page, pageSize };
  }
}
