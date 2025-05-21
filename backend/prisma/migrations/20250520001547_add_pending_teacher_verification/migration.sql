/*
  Warnings:

  - You are about to drop the column `equipment` on the `scheduleslot` table. All the data in the column will be lost.
  - You are about to drop the column `room` on the `scheduleslot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `verification` DROP FOREIGN KEY `Verification_userId_fkey`;

-- AlterTable
ALTER TABLE `scheduleslot` DROP COLUMN `equipment`,
    DROP COLUMN `room`,
    ADD COLUMN `roomId` INTEGER NULL;

-- AlterTable
ALTER TABLE `surveillanceassignment` ADD COLUMN `roomId` INTEGER NULL;

-- AlterTable
ALTER TABLE `verification` ADD COLUMN `pendingTeacherId` INTEGER NULL,
    MODIFY `userId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Room` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('SALLE_TP', 'SALLE_TD', 'SALLE_COURS') NOT NULL,
    `capacity` INTEGER NULL,
    `floor` INTEGER NULL,
    `building` VARCHAR(191) NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Room_number_key`(`number`),
    INDEX `Room_type_building_idx`(`type`, `building`),
    INDEX `Room_number_idx`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ScheduleSlot_roomId_idx` ON `ScheduleSlot`(`roomId`);

-- CreateIndex
CREATE INDEX `SurveillanceAssignment_roomId_idx` ON `SurveillanceAssignment`(`roomId`);

-- AddForeignKey
ALTER TABLE `Verification` ADD CONSTRAINT `Verification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Verification` ADD CONSTRAINT `Verification_pendingTeacherId_fkey` FOREIGN KEY (`pendingTeacherId`) REFERENCES `PendingTeacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveillanceAssignment` ADD CONSTRAINT `SurveillanceAssignment_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
