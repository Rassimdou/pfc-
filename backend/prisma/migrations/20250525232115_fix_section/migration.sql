/*
  Warnings:

  - You are about to drop the column `number` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `surveillanceassignment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,moduleId,academicYear]` on the table `Section` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `surveillanceassignment` DROP FOREIGN KEY `SurveillanceAssignment_roomId_fkey`;

-- DropIndex
DROP INDEX `Room_number_idx` ON `room`;

-- DropIndex
DROP INDEX `Room_number_key` ON `room`;

-- DropIndex
DROP INDEX `Room_type_building_idx` ON `room`;

-- DropIndex
DROP INDEX `SurveillanceAssignment_date_userId_idx` ON `surveillanceassignment`;

-- DropIndex
DROP INDEX `SurveillanceAssignment_module_room_idx` ON `surveillanceassignment`;

-- AlterTable
ALTER TABLE `room` DROP COLUMN `number`;

-- AlterTable
ALTER TABLE `scheduleslot` ADD COLUMN `classroomId` INTEGER NULL;

-- AlterTable
ALTER TABLE `surveillanceassignment` DROP COLUMN `roomId`,
    ADD COLUMN `roomRefId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Classroom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Classroom_name_key`(`name`),
    INDEX `Classroom_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Room_name_key` ON `Room`(`name`);

-- CreateIndex
CREATE INDEX `Room_name_type_idx` ON `Room`(`name`, `type`);

-- CreateIndex
CREATE INDEX `ScheduleSlot_classroomId_idx` ON `ScheduleSlot`(`classroomId`);

-- CreateIndex
CREATE INDEX `Section_moduleId_idx` ON `Section`(`moduleId`);

-- CreateIndex
CREATE UNIQUE INDEX `Section_name_moduleId_academicYear_key` ON `Section`(`name`, `moduleId`, `academicYear`);

-- CreateIndex
CREATE INDEX `SurveillanceAssignment_roomRefId_idx` ON `SurveillanceAssignment`(`roomRefId`);

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceAssignment` ADD CONSTRAINT `SurveillanceAssignment_roomRefId_fkey` FOREIGN KEY (`roomRefId`) REFERENCES `Room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `section` RENAME INDEX `Section_palierId_fkey` TO `Section_palierId_idx`;

-- RenameIndex
ALTER TABLE `surveillanceassignment` RENAME INDEX `SurveillanceAssignment_moduleId_fkey` TO `SurveillanceAssignment_moduleId_idx`;

-- RenameIndex
ALTER TABLE `surveillanceassignment` RENAME INDEX `SurveillanceAssignment_userId_fkey` TO `SurveillanceAssignment_userId_idx`;
