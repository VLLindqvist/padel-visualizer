DROP TABLE IF EXISTS tournament_images;
DROP TABLE IF EXISTS tournament_teams;
DROP TABLE IF EXISTS set_results;
DROP TABLE IF EXISTS player_yearly_stats;
DROP TABLE IF EXISTS player_race_stats;
DROP TABLE IF EXISTS player_images;
DROP TABLE IF EXISTS player_teams;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS phase_round;
DROP TABLE IF EXISTS tournament_phases;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS tournament_types;

-- countries
CREATE TABLE IF NOT EXISTS countries (
    `country_code` VARCHAR(2) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255),
    `image_url` VARCHAR(255)
);

-- tournament_types
CREATE TABLE IF NOT EXISTS tournament_types (
    `name` VARCHAR(255) NOT NULL PRIMARY KEY
);

-- tournaments
CREATE TABLE IF NOT EXISTS tournaments (
    `url` VARCHAR(255) NOT NULL PRIMARY KEY,
    `page_url` VARCHAR(255),
    `name` VARCHAR(255),
    `year` SMALLINT UNSIGNED,
    `place` VARCHAR(255),
    `dateFrom` DATE,
    `dateTo` DATE,
    `category` ENUM('male', 'female', 'both'),
    `type` VARCHAR(255) NOT NULL,
    `posterUrl` VARCHAR(255),

    CONSTRAINT fk_tournaments_tournament_types
        FOREIGN KEY (`type`)
        REFERENCES tournament_types(`name`)
);

-- tournament_images
CREATE TABLE IF NOT EXISTS tournament_images (
    `tournament` VARCHAR(255) NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (`tournament`, `image_url`),
    CONSTRAINT fk_tournament_images_tournament
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`url`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- teams
CREATE TABLE IF NOT EXISTS teams (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `first_tournament` VARCHAR(255) NOT NULL,
    `last_tournament` VARCHAR(255) NOT NULL,

    CONSTRAINT fk_first_tournament_tournament
        FOREIGN KEY (`first_tournament`)
        REFERENCES tournaments(`url`),
    CONSTRAINT fk_last_tournament_tournament
        FOREIGN KEY (`last_tournament`)
        REFERENCES tournaments(`url`)
);

-- tournament_teams
CREATE TABLE IF NOT EXISTS tournament_teams (
    `tournament` VARCHAR(255) NOT NULL,
    `team` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`tournament`, `team`),
    CONSTRAINT fk_tournament_teams_tournament
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`url`),
    CONSTRAINT fk_tournament_teams_team
        FOREIGN KEY (`team`)
        REFERENCES teams(`id`)
);

-- tournament_phases
CREATE TABLE IF NOT EXISTS tournament_phases (
    `name` VARCHAR(255) NOT NULL PRIMARY KEY
);

-- phase_round
CREATE TABLE IF NOT EXISTS phase_round (
    `name` VARCHAR(255) NOT NULL PRIMARY KEY,
    `phase` VARCHAR(255) NOT NULL,

    CONSTRAINT fk_phase_round_phase
        FOREIGN KEY (`phase`)
        REFERENCES tournament_phases(`name`)
);

-- matches
CREATE TABLE IF NOT EXISTS matches (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `first_team` INT UNSIGNED NOT NULL,
    `second_team` INT UNSIGNED NOT NULL,
    `tournament` VARCHAR(255) NOT NULL,
    `round` VARCHAR(255) NOT NULL,
    `category` ENUM('male', 'female'),

    CONSTRAINT uq_matches_first_team_tournament_round UNIQUE (`first_team`, `tournament`, `round`),
    CONSTRAINT uq_matches_second_team_tournament_round UNIQUE (`second_team`, `tournament`, `round`),
    CONSTRAINT fk_matches_first_team
        FOREIGN KEY (`first_team`)
        REFERENCES teams(`id`),
    CONSTRAINT fk_matches_second_team
        FOREIGN KEY (`second_team`)
        REFERENCES teams(`id`),
    CONSTRAINT fk_matches_tournament
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`url`),
    CONSTRAINT fk_matches_match_round
        FOREIGN KEY (`round`)
        REFERENCES phase_round(`name`)
);

-- set_results
CREATE TABLE IF NOT EXISTS set_results (
    `match` INT UNSIGNED NOT NULL,
    `set` ENUM('1', '2', '3') NOT NULL,
    `first_team_res` TINYINT UNSIGNED DEFAULT 0,
    `second_team_res` TINYINT UNSIGNED DEFAULT 0,

    PRIMARY KEY (`match`, `set`),
    CONSTRAINT fk_set_results_match
        FOREIGN KEY (`match`)
        REFERENCES matches(`id`)
);

-- players
CREATE TABLE IF NOT EXISTS players (
    `url` VARCHAR(255) NOT NULL PRIMARY KEY,
    `first_name` VARCHAR(255),
    `middle_name` VARCHAR(255),
    `last_name` VARCHAR(255),
    `points` INT UNSIGNED,
    `rank` SMALLINT UNSIGNED,
    `profile_image_url` VARCHAR(255),
    `country` VARCHAR(2) NOT NULL,
    `current_team` INT UNSIGNED NOT NULL,
    `birthplace` VARCHAR(255),
    `birthdate` DATE,
    `height` DOUBLE(10, 3),
    `hometown` VARCHAR(255),
    `consecutive_wins` SMALLINT UNSIGNED,
    `total_matches_played` SMALLINT UNSIGNED,
    `total_matches_won` SMALLINT UNSIGNED,
    `preffered_court_position` ENUM('right', 'left'),
    `category` ENUM('male', 'female'),

    CONSTRAINT fk_players_countries
        FOREIGN KEY (`country`)
        REFERENCES countries(`country_code`),
    CONSTRAINT fk_player_current_team
        FOREIGN KEY (`current_team`)
        REFERENCES teams(`id`)
);

-- player_yearly_stats
CREATE TABLE IF NOT EXISTS player_yearly_stats (
    `url` VARCHAR(255) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `matches_played` SMALLINT UNSIGNED,
    `matches_won` SMALLINT UNSIGNED,
    `tournament_wins` SMALLINT UNSIGNED,
    `tournament_finals` SMALLINT UNSIGNED,
    `tournament_semis` SMALLINT UNSIGNED,
    `tournament_quarters` SMALLINT UNSIGNED,
    `tournament_round_of_eight` SMALLINT UNSIGNED,
    `tournament_round_of_sixteen` SMALLINT UNSIGNED,

    PRIMARY KEY (`url`, `year`),
    CONSTRAINT fk_yearly_stats_players
        FOREIGN KEY (`url`)
        REFERENCES players(`url`)
);

-- player_race_stats
CREATE TABLE IF NOT EXISTS player_race_stats (
    `url` VARCHAR(255) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `points` SMALLINT UNSIGNED,
    `rank` SMALLINT UNSIGNED,

    PRIMARY KEY (`url`, `year`),
    CONSTRAINT fk_yearly_race_stats_players
        FOREIGN KEY (`url`)
        REFERENCES players(`url`)
);

-- player_images
CREATE TABLE IF NOT EXISTS player_images (
    `player` VARCHAR(255) NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (`player`, `image_url`),
    CONSTRAINT fk_player_images_player
        FOREIGN KEY (`player`)
        REFERENCES players(`url`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- player_teams
CREATE TABLE IF NOT EXISTS player_teams (
    `player` VARCHAR(255) NOT NULL,
    `team` INT UNSIGNED NOT NULL,
    `court_position` ENUM('right', 'left') DEFAULT 'right',
    
    PRIMARY KEY (`player`, `team`),
    CONSTRAINT uq_player_teams_position UNIQUE (`team`, `court_position`),
    CONSTRAINT fk_player_teams_player
        FOREIGN KEY (`player`)
        REFERENCES players(`url`),
    CONSTRAINT fk_player_teams_team
        FOREIGN KEY (`team`)
        REFERENCES teams(`id`)
);
