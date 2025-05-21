-- CreateTable
CREATE TABLE `Palier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Palier_name_key`(`name`),
    INDEX `Palier_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create default paliers
INSERT INTO `Palier` (`name`, `createdAt`, `updatedAt`) VALUES
('LMD', NOW(), NOW()),
('SIGL', NOW(), NOW()),
('ING', NOW(), NOW());

-- Add palierId to Speciality
ALTER TABLE `Speciality` ADD COLUMN `palierId` INTEGER NULL;

-- Update existing specialities to link with LMD palier
UPDATE `Speciality` SET `palierId` = (SELECT `id` FROM `Palier` WHERE `name` = 'LMD') WHERE `palierId` IS NULL;

-- Make palierId required
ALTER TABLE `Speciality` MODIFY `palierId` INTEGER NOT NULL;

-- Add palierId to Module
ALTER TABLE `Module` ADD COLUMN `palierId` INTEGER NULL;

-- Update existing modules to link with LMD palier
UPDATE `Module` SET `palierId` = (SELECT `id` FROM `Palier` WHERE `name` = 'LMD') WHERE `palierId` IS NULL;

-- Make palierId required
ALTER TABLE `Module` MODIFY `palierId` INTEGER NOT NULL;

-- Add palierId to Section
ALTER TABLE `Section` ADD COLUMN `palierId` INTEGER NULL;

-- Update existing sections to link with LMD palier
UPDATE `Section` SET `palierId` = (SELECT `id` FROM `Palier` WHERE `name` = 'LMD') WHERE `palierId` IS NULL;

-- Add foreign key constraints
ALTER TABLE `Speciality` ADD CONSTRAINT `Speciality_palierId_fkey` FOREIGN KEY (`palierId`) REFERENCES `Palier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Module` ADD CONSTRAINT `Module_palierId_fkey` FOREIGN KEY (`palierId`) REFERENCES `Palier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Section` ADD CONSTRAINT `Section_palierId_fkey` FOREIGN KEY (`palierId`) REFERENCES `Palier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; 