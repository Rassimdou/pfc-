/*
  Warnings:

  - You are about to drop the column `Palier` on the `module` table. All the data in the column will be lost.
  - You are about to drop the column `Semestre` on the `module` table. All the data in the column will be lost.
  - You are about to drop the column `Semestre` on the `scheduleslot` table. All the data in the column will be lost.
  - You are about to alter the column `dayOfWeek` on the `scheduleslot` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Enum(EnumId(4))`.
  - You are about to drop the column `Palier` on the `section` table. All the data in the column will be lost.
  - You are about to drop the column `Palier` on the `speciality` table. All the data in the column will be lost.
  - You are about to drop the column `swapWithId` on the `surveillanceassignment` table. All the data in the column will be lost.
  - You are about to drop the column `fromAssignment` on the `surveillanceswaprequest` table. All the data in the column will be lost.
  - You are about to drop the column `toAssignment` on the `surveillanceswaprequest` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `surveillanceswaprequest` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(5))`.
  - You are about to alter the column `role` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[code,academicYear]` on the table `Module` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fromAssignmentId,toAssignmentId]` on the table `SurveillanceSwapRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academicYear` to the `Module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `palier` to the `Module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semestre` to the `Module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `palier` to the `Speciality` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moduleId` to the `SurveillanceAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromAssignmentId` to the `SurveillanceSwapRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toAssignmentId` to the `SurveillanceSwapRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SurveillanceSwapRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Module_code_key` ON `module`;

-- DropIndex
DROP INDEX `Speciality_name_idx` ON `speciality`;

-- AlterTable
ALTER TABLE `module` DROP COLUMN `Palier`,
    DROP COLUMN `Semestre`,
    ADD COLUMN `academicYear` INTEGER NOT NULL,
    ADD COLUMN `palier` ENUM('LMD', 'ING', 'SIGL') NOT NULL,
    ADD COLUMN `semestre` ENUM('SEMESTRE1', 'SEMESTRE2') NOT NULL;

-- AlterTable
ALTER TABLE `refreshtoken` ADD COLUMN `expiresAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `scheduleslot` DROP COLUMN `Semestre`,
    MODIFY `dayOfWeek` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY') NOT NULL;

-- AlterTable
ALTER TABLE `section` DROP COLUMN `Palier`,
    ADD COLUMN `palier` ENUM('LMD', 'ING', 'SIGL') NULL;

-- AlterTable
ALTER TABLE `speciality` DROP COLUMN `Palier`,
    ADD COLUMN `palier` ENUM('LMD', 'ING', 'SIGL') NOT NULL;

-- AlterTable
ALTER TABLE `surveillanceassignment` DROP COLUMN `swapWithId`,
    ADD COLUMN `moduleId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `surveillanceswaprequest` DROP COLUMN `fromAssignment`,
    DROP COLUMN `toAssignment`,
    ADD COLUMN `fromAssignmentId` INTEGER NOT NULL,
    ADD COLUMN `toAssignmentId` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('PROFESSOR', 'ADMIN', 'ASSISTANT') NOT NULL DEFAULT 'PROFESSOR';

-- CreateTable
CREATE TABLE `SurveillanceFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `originalName` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `SurveillanceFile_path_key`(`path`),
    INDEX `SurveillanceFile_uploadedAt_idx`(`uploadedAt`),
    INDEX `SurveillanceFile_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Module_specialityId_academicYear_idx` ON `Module`(`specialityId`, `academicYear`);

-- CreateIndex
CREATE UNIQUE INDEX `Module_code_academicYear_key` ON `Module`(`code`, `academicYear`);

-- CreateIndex
CREATE INDEX `Speciality_name_palier_idx` ON `Speciality`(`name`, `palier`);

-- CreateIndex
CREATE INDEX `SurveillanceAssignment_date_userId_idx` ON `SurveillanceAssignment`(`date`, `userId`);

-- CreateIndex
CREATE INDEX `SurveillanceAssignment_module_room_idx` ON `SurveillanceAssignment`(`module`, `room`);

-- CreateIndex
CREATE UNIQUE INDEX `SurveillanceSwapRequest_fromAssignmentId_toAssignmentId_key` ON `SurveillanceSwapRequest`(`fromAssignmentId`, `toAssignmentId`);

-- CreateIndex
CREATE INDEX `User_email_role_idx` ON `User`(`email`, `role`);

-- CreateIndex
CREATE INDEX `User_createdAt_idx` ON `User`(`createdAt`);

-- AddForeignKey
ALTER TABLE `SurveillanceAssignment` ADD CONSTRAINT `SurveillanceAssignment_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceSwapRequest` ADD CONSTRAINT `SurveillanceSwapRequest_fromAssignmentId_fkey` FOREIGN KEY (`fromAssignmentId`) REFERENCES `SurveillanceAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceSwapRequest` ADD CONSTRAINT `SurveillanceSwapRequest_toAssignmentId_fkey` FOREIGN KEY (`toAssignmentId`) REFERENCES `SurveillanceAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceSwapRequest` ADD CONSTRAINT `SurveillanceSwapRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceFile` ADD CONSTRAINT `SurveillanceFile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
