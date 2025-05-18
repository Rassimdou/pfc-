-- AlterTable
ALTER TABLE `module` ADD COLUMN `Palier` ENUM('LMD', 'ING', 'SIGL') NULL,
    ADD COLUMN `Semestre` ENUM('SEMESTRE1', 'SEMESTRE2') NULL;

-- AlterTable
ALTER TABLE `scheduleslot` ADD COLUMN `Semestre` ENUM('SEMESTRE1', 'SEMESTRE2') NULL;

-- AlterTable
ALTER TABLE `section` ADD COLUMN `Palier` ENUM('LMD', 'ING', 'SIGL') NULL;

-- AlterTable
ALTER TABLE `speciality` ADD COLUMN `Palier` ENUM('LMD', 'ING', 'SIGL') NULL;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `RefreshToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveillanceAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `time` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `room` VARCHAR(191) NOT NULL,
    `isResponsible` BOOLEAN NOT NULL DEFAULT false,
    `canSwap` BOOLEAN NOT NULL DEFAULT true,
    `swapWithId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveillanceSwapRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fromAssignment` INTEGER NOT NULL,
    `toAssignment` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceAssignment` ADD CONSTRAINT `SurveillanceAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
