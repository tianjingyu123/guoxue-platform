import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MerchantService } from "./merchant.service";
import { SignAgreementDto, CreateAgreementDto, UpdateAgreementDto, PaginationDto } from "./merchant.dto";

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
    if (!agreement) throw new NotFoundException("暂无可用的入驻协议");
    return agreement;
  }

  /** 商家签署协议 */
  async signAgreement(userId: string, ipAddress: string, dto: SignAgreementDto) {
    if (!dto.agreed) throw new BadRequestException("需要同意协议才能签署");

    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new NotFoundException("商家不存在");
    if (merchant.status !== "AGREEMENT_PENDING") throw new BadRequestException("当前状态不可签署协议");

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
    if (!agreement) throw new NotFoundException("协议不存在");

    return this.prisma.merchantAgreement.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title } : {}),
        ...(dto.content != null ? { content: dto.content } : {}),
      },
    });
  }

  async deleteAgreement(id: string) {
    await this.prisma.merchantAgreement.delete({ where: { id } });
  }

  async listAgreements(query: PaginationDto) {
    const { page = 1, pageSize = 20 } = query;
    const [list, total] = await Promise.all([
      this.prisma.merchantAgreement.findMany({
        where: { merchantId: "TEMPLATE" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.merchantAgreement.count({ where: { merchantId: "TEMPLATE" } }),
    ]);
    return { list, total, page, pageSize };
  }
}
