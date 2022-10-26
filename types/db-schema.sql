DROP TABLE IF EXISTS tournament_images;
DROP TABLE IF EXISTS tournament_teams;
DROP TABLE IF EXISTS set_results;
DROP TABLE IF EXISTS player_yearly_stats;
DROP TABLE IF EXISTS player_race_stats;
DROP TABLE IF EXISTS player_images;
DROP TABLE IF EXISTS player_teams;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tournament_referees;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS tournament_phases;
DROP TABLE IF EXISTS tournament_rounds;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS tournament_types;
DROP TABLE IF EXISTS referees;

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
    `id` VARCHAR(255) NOT NULL PRIMARY KEY,
    `page_url` VARCHAR(255),
    `name` VARCHAR(255),
    `year` SMALLINT UNSIGNED,
    `place` VARCHAR(255),
    `date_from` DATE,
    `date_to` DATE,
    `category` ENUM('male', 'female', 'both'),
    `type` VARCHAR(255) NOT NULL,
    `poster_url` VARCHAR(255),
    `last_scraped` DATE DEFAULT NULL,

    UNIQUE(`id`),
    CONSTRAINT fk_tournaments_tournament_types
        FOREIGN KEY (`type`)
        REFERENCES tournament_types(`name`)
);

CREATE TRIGGER before_tournaments_insert BEFORE INSERT ON tournaments FOR EACH ROW SET new.`last_scraped` = CURRENT_DATE();
CREATE TRIGGER before_tournaments_update BEFORE UPDATE ON tournaments FOR EACH ROW SET new.`last_scraped` = CURRENT_DATE();

-- tournament_images
CREATE TABLE IF NOT EXISTS tournament_images (
    `tournament` VARCHAR(255) NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (`tournament`, `image_url`),
    CONSTRAINT fk_tournament_images_tournament
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- referees
CREATE TABLE IF NOT EXISTS referees (
    `name` VARCHAR(255) NOT NULL PRIMARY KEY
);

-- tournament_referees
CREATE TABLE IF NOT EXISTS tournament_referees (
    `tournament` VARCHAR(255) NOT NULL,
    `referee` VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (`tournament`, `referee`),
    CONSTRAINT fk_tournament_referees
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_tournament_referees_tournament
        FOREIGN KEY (`referee`)
        REFERENCES referees(`name`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- teams
CREATE TABLE IF NOT EXISTS teams (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `first_tournament` VARCHAR(255) DEFAULT NULL,
    `last_tournament` VARCHAR(255) DEFAULT NULL,

    CONSTRAINT fk_first_tournament_tournament
        FOREIGN KEY (`first_tournament`)
        REFERENCES tournaments(`id`),
    CONSTRAINT fk_last_tournament_tournament
        FOREIGN KEY (`last_tournament`)
        REFERENCES tournaments(`id`)
);

-- tournament_teams
CREATE TABLE IF NOT EXISTS tournament_teams (
    `tournament` VARCHAR(255) NOT NULL,
    `team` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`tournament`, `team`),
    CONSTRAINT fk_tournament_teams_tournament
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`id`),
    CONSTRAINT fk_tournament_teams_team
        FOREIGN KEY (`team`)
        REFERENCES teams(`id`)
);

-- tournament_phases
CREATE TABLE IF NOT EXISTS tournament_phases (
    `name` VARCHAR(255) NOT NULL PRIMARY KEY
);

-- tournament_rounds
CREATE TABLE IF NOT EXISTS tournament_rounds (
    `name` VARCHAR(255) NOT NULL PRIMARY KEY
);

-- matches
CREATE TABLE IF NOT EXISTS matches (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `first_team` INT UNSIGNED NOT NULL,
    `second_team` INT UNSIGNED NOT NULL,
    `tournament` VARCHAR(255) NOT NULL,
    `phase` VARCHAR(255),
    `round` VARCHAR(255),
    `category` ENUM('male', 'female'),

    CONSTRAINT fk_matches_first_team
        FOREIGN KEY (`first_team`)
        REFERENCES teams(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_matches_second_team
        FOREIGN KEY (`second_team`)
        REFERENCES teams(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_matches_tournament
        FOREIGN KEY (`tournament`)
        REFERENCES tournaments(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_matches_match_phase
        FOREIGN KEY (`phase`)
        REFERENCES tournament_phases(`name`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_matches_match_round
        FOREIGN KEY (`round`)
        REFERENCES tournament_rounds(`name`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
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
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- players
CREATE TABLE IF NOT EXISTS players (
    `id` VARCHAR(255) NOT NULL PRIMARY KEY,
    `first_name` VARCHAR(255),
    `middle_name` VARCHAR(255),
    `last_name` VARCHAR(255),
    `points` INT UNSIGNED,
    `rank` SMALLINT UNSIGNED,
    `profile_image_url` VARCHAR(255),
    `country` VARCHAR(2),
    `current_team` INT UNSIGNED,
    `birthplace` VARCHAR(255),
    `birthdate` DATE,
    `height` DOUBLE(10, 3),
    `hometown` VARCHAR(255),
    `consecutive_wins` SMALLINT UNSIGNED,
    `total_matches_played` SMALLINT UNSIGNED,
    `total_matches_won` SMALLINT UNSIGNED,
    `preferred_court_position` ENUM('right', 'left'),
    `category` ENUM('male', 'female'),
    `last_scraped` DATE DEFAULT NULL,

    CONSTRAINT fk_players_countries
        FOREIGN KEY (`country`)
        REFERENCES countries(`country_code`),
    CONSTRAINT fk_player_current_team
        FOREIGN KEY (`current_team`)
        REFERENCES teams(`id`)
);

CREATE TRIGGER before_players_insert BEFORE INSERT ON players FOR EACH ROW SET new.`last_scraped` = CURRENT_DATE();
CREATE TRIGGER before_players_update BEFORE UPDATE ON players FOR EACH ROW SET new.`last_scraped` = CURRENT_DATE();

-- player_yearly_stats
CREATE TABLE IF NOT EXISTS player_yearly_stats (
    `player` VARCHAR(255) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `matches_played` SMALLINT UNSIGNED,
    `matches_won` SMALLINT UNSIGNED,
    `tournament_wins` SMALLINT UNSIGNED,
    `tournament_finals` SMALLINT UNSIGNED,
    `tournament_semis` SMALLINT UNSIGNED,
    `tournament_quarters` SMALLINT UNSIGNED,
    `tournament_round_of_eight` SMALLINT UNSIGNED,
    `tournament_round_of_sixteen` SMALLINT UNSIGNED,

    PRIMARY KEY (`player`, `year`),
    CONSTRAINT fk_yearly_stats_players
        FOREIGN KEY (`player`)
        REFERENCES players(`id`)
);

-- player_race_stats
CREATE TABLE IF NOT EXISTS player_race_stats (
    `player` VARCHAR(255) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `points` SMALLINT UNSIGNED,
    `rank` SMALLINT UNSIGNED,

    PRIMARY KEY (`player`, `year`),
    CONSTRAINT fk_yearly_race_stats_players
        FOREIGN KEY (`player`)
        REFERENCES players(`id`)
);

-- player_images
CREATE TABLE IF NOT EXISTS player_images (
    `player` VARCHAR(255) NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (`player`, `image_url`),
    CONSTRAINT fk_player_images_player
        FOREIGN KEY (`player`)
        REFERENCES players(`id`)
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
        REFERENCES players(`id`),
    CONSTRAINT fk_player_teams_team
        FOREIGN KEY (`team`)
        REFERENCES teams(`id`)
);

DELIMITER //
DROP PROCEDURE IF EXISTS create_team//
CREATE PROCEDURE create_team(IN left_player VARCHAR(255), IN right_player VARCHAR(255), OUT team_id INT UNSIGNED)
LANGUAGE SQL MODIFIES SQL DATA SQL SECURITY INVOKER
BEGIN
    SELECT pt1.team INTO team_id
    FROM player_teams AS pt1, player_teams AS pt2
    WHERE pt1.player = left_player
    AND pt2.player = right_player
    AND pt1.court_position = 'left'
    AND pt2.court_position = 'right'
    AND pt1.team = pt2.team
    ORDER BY pt1.team
    LIMIT 1;

    IF ISNULL(team_id) THEN
        INSERT INTO teams () VALUES ();

        SELECT LAST_INSERT_ID() INTO team_id;

        INSERT IGNORE INTO player_teams
        (`player`, `team`, `court_position`)
        VALUES
        (left_player, team_id, 'left'), (right_player, team_id, 'right');
    END IF;
END//
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS update_team_first_last_tournament//
CREATE PROCEDURE update_team_first_last_tournament()
LANGUAGE SQL MODIFIES SQL DATA SQL SECURITY INVOKER
BEGIN
    UPDATE teams AS t
    INNER JOIN tournament_teams AS tt ON tt.team = t.id
    SET
    t.first_tournament = (
        SELECT tou.id
        FROM tournaments AS tou
        WHERE tou.date_from = (SELECT MIN(date_from) FROM tournaments)
        AND tt.tournament = tou.id
        ORDER BY tou.id
        LIMIT 1
    ),
    t.last_tournament = (
        SELECT tou.id
        FROM tournaments AS tou
        WHERE tou.date_from = (SELECT MAX(date_from) FROM tournaments)
        AND tt.tournament = tou.id
        AND t.first_tournament != tou.id
        ORDER BY tou.id
        LIMIT 1
    );
END//
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS update_current_team//
CREATE PROCEDURE update_current_team()
LANGUAGE SQL MODIFIES SQL DATA SQL SECURITY INVOKER
BEGIN
    UPDATE players AS p
    INNER JOIN player_teams AS pt ON pt.player = p.id
    SET
    p.current_team = (
        SELECT pt.team
        FROM tournaments AS tou
        INNER JOIN tournament_teams AS tt ON tt.tournament = tou.id
        WHERE pt.team = tt.team
        ORDER BY tou.date_from DESC
        LIMIT 1
    );
END//
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS add_set_result//
CREATE PROCEDURE add_set_result(IN _tournament VARCHAR(255), IN _first_team INT UNSIGNED, IN _second_team INT UNSIGNED, IN _phase VARCHAR(255), IN _round VARCHAR(255), IN _set ENUM('1', '2', '3'), IN _first_team_res TINYINT, IN _second_team_res TINYINT)
LANGUAGE SQL MODIFIES SQL DATA SQL SECURITY INVOKER
BEGIN
    DECLARE currentCategory VARCHAR(10) DEFAULT 'male';
    DECLARE matchId INT UNSIGNED DEFAULT NULL;

    INSERT IGNORE INTO tournament_phases (`name`) VALUES (_phase);

    INSERT IGNORE INTO tournament_rounds (`name`) VALUES (_round);

    SELECT p.category INTO currentCategory
    FROM players AS p
    INNER JOIN player_teams AS pt ON pt.team = _first_team OR pt.team = _second_team
    ORDER BY p.id
    LIMIT 1;

    SELECT m.id INTO matchId
    FROM matches AS m
    WHERE m.tournament = _tournament
        AND (
            (m.first_team = _first_team AND m.second_team = _second_team)
            OR (m.first_team = _second_team AND m.second_team = _first_team)
        )
        AND m.phase = _phase
        AND m.round = _round
    ORDER BY m.id
    LIMIT 1;

    IF ISNULL(matchId) THEN
        INSERT INTO matches
        (`first_team`, `second_team`, `tournament`, `phase`, `round`, `category`)
        VALUES
        (_first_team, _second_team, _tournament, _phase, _round, currentCategory);

        SELECT LAST_INSERT_ID() INTO matchId;
    END IF;

    INSERT INTO set_results
    (`match`, `set`, `first_team_res`, `second_team_res`)
    VALUES
    (matchId, _set, _first_team_res, _second_team_res)
    ON DUPLICATE KEY UPDATE
    `first_team_res` = _first_team_res,
    `second_team_res` = _second_team_res;
END//
DELIMITER ;
