-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_specialityId_fkey`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `firstName` VARCHAR(191) NULL,
    ADD COLUMN `lastName` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `_SpecialityToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_SpecialityToUser_AB_unique`(`A`, `B`),
    INDEX `_SpecialityToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_SpecialityToUser` ADD CONSTRAINT `_SpecialityToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Speciality`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SpecialityToUser` ADD CONSTRAINT `_SpecialityToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
