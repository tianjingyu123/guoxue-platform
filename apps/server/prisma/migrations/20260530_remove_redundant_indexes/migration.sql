-- DropIndex: LiveProduct.liveId 已被 @@unique([liveId, productId]) 左前缀覆盖
DROP INDEX "LiveProduct_liveId_idx";

-- DropIndex: VirtualCoinAccount.userId 已被 @unique 覆盖
DROP INDEX "VirtualCoinAccount_userId_idx";
