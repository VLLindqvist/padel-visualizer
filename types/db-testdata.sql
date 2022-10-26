-- Test data
INSERT INTO tournament_types
(`name`)
VALUES
('open');

INSERT INTO countries
(`country_code`, `name`, `image_url`)
VALUES
('ES', 'Spain', 'https://www.worldpadeltour.com/media/images/flags/es.png'),
('AR', 'Argentina', 'https://www.worldpadeltour.com/media/images/flags/ar.png');

-- tournaments
INSERT INTO tournaments
(`id`, `page_url`, `name`, `year`, `place`, `date_from`, `date_to`, `category`, `type`, `poster_url`)
VALUES
('estrella-damm-menorca-open-2022', 'https://www.worldpadeltour.com/en/tournaments/estrella-damm-menorca-open-2022/2022/', 'Estrella Damm Menorca Open 2022', 2022, 'Mahón', '2022-10-15', '2022-10-23', 'male', 'open', 'https://www.worldpadeltour.com/media-content/2022/04/estrella-damm-menorca-open-2022-455eeebe88.JPG');

INSERT INTO teams
(`first_tournament`)
VALUES
('estrella-damm-menorca-open-2022'),
('estrella-damm-menorca-open-2022'),
('estrella-damm-menorca-open-2022');

INSERT INTO players
(`id`, `first_name`, `middle_name`, `last_name`, `points`, `rank`, `profile_image_url`, `country`, `current_team`, `birthplace`, `birthdate`, `height`, `hometown`, `consecutive_wins`, `total_matches_played`, `total_matches_won`, `preferred_court_position`, `category`)
VALUES
('alejandro-galan-romo', 'Alejandro', 'Galán', 'Romo', 14470, 1, 'https://www.worldpadeltour.com/media-content/2022/05/alejandro-galn-romo-504e626a7f-220x260.JPG', 'es', 1, 'Madrid', '1996-05-15', 186, 'Madrid', 18, 420, 306, 'left', 'male'),
('juan-lebron', 'Juan', 'Lebrón', 'Chincoa', 14470, 1, 'https://www.worldpadeltour.com/media-content/2022/05/juan-lebrn-chincoa-f8ffc5f991-220x260.JPG', 'es', 1, 'Puerto de Sta. María', '1995-01-30', 184, 'Madrid', 18, 435, 299, 'left', 'male'),
('agustin-tapia', 'Agustín', '', 'Tapia', 12275, 3, 'https://www.worldpadeltour.com/media-content/2022/05/agustn-tapia-848c54338a-220x260.JPG', 'ar', 2, 'Catamarca', '1999-07-24', 179, 'Barcelona', 11, 237, 168, 'left', 'male'),
('carlos-daniel-gutierrez', 'Carlos', 'Daniel', 'Gutérrez', 12275, 3, 'https://www.worldpadeltour.com/media-content/2022/07/carlos-daniel-gutirrez-c6a9dcc0b8-220x260.JPG', 'ar', 2, 'San Luis', '1984-06-15', 177, 'Madrid', 13, 544, 420, 'right', 'male'),
('francisco-navarro-compan', 'Francisco', 'Navarro', 'Compán', 10595, 5, 'https://www.worldpadeltour.com/media-content/2022/05/francisco-navarro-compn-d5d0783a50-220x260.JPG', 'es', 3, 'Sevilla', '1989-02-10', 181, 'Madrid', 15, 531, 397, 'right', 'male'),
('martin-di-nenno', 'Martín', 'Di', 'Nenno', 10595, 5, 'https://www.worldpadeltour.com/media-content/2022/05/martn-di-nenno-b1a7ed7c39-220x260.JPG', 'ar', 3, 'Ezieza', '1997-03-18', 175, 'Buenos Aires', 12, 324, 221, 'right', 'male');

INSERT INTO player_images
(`player`, `image_url`)
VALUES
('alejandro-galan-romo', 'https://www.worldpadeltour.com/media-content/2022/05/destacada-alejandro-galn-romo-fccf16f184-1200x500.JPG'),
('alejandro-galan-romo', 'https://www.zonadepadel.com/blog/wp-content/uploads/sites/3/2022/06/ale-galan-2022.jpg'),
('juan-lebron', 'https://www.worldpadeltour.com/media-content/2022/05/destacada-juan-lebrn-chincoa-deec6d538d-1200x500.JPG'),
('juan-lebron', 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fpadel-magazine.se%2Fjuan-lebron-snart-1-v%25C3%25A4rldsnummer%2F&psig=AOvVaw1ZjRDhLnt7a2nBPYQ-eCd3&ust=1665820808639000&source=images&cd=vfe&ved=0CAwQjRxqFwoTCODQ8Z2g3_oCFQAAAAAdAAAAABAE'),
('juan-lebron', 'https://img.redbull.com/images/c_limit,w_1500,h_1000,f_auto,q_auto/redbullcom/2021/6/4/lq1inacwyglihlyz3wap/juan-lebron-chincoa-padel');

INSERT INTO player_teams
(`player`, `team`, `court_position`)
VALUES
('alejandro-galan-romo', 1, 'left'),
('juan-lebron', 1, 'right'),
('agustin-tapia', 2, 'left'),
('carlos-daniel-gutierrez', 2, 'right'),
('francisco-navarro-compan', 3, 'left'),
('martin-di-nenno', 3, 'right');

INSERT INTO tournament_images
(`tournament`, `image_url`)
VALUES
('estrella-damm-menorca-open-2022', 'https://www.worldpadeltour.com/media-content/2022/04/destacada-estrella-damm-menorca-open-2022-a1c871943b-1090x360.JPG');

INSERT INTO player_yearly_stats
( `player`, `year`, `matches_played`, `matches_won`, `tournament_wins`, `tournament_finals`, `tournament_semis`, `tournament_quarters`, `tournament_round_of_eight`, `tournament_round_of_sixteen`)
VALUES
('juan-lebron', 2022, 59, 48, 6, 5, 2, 2, 2, 0),
('juan-lebron', 2021, 50, 40, 6, 5, 2, 2, 2, 0),
('alejandro-galan-romo', 2022, 59, 48, 6, 5, 2, 2, 2, 0);

INSERT INTO player_race_stats (`player`, `year`, `points`, `rank`)
VALUES
('juan-lebron', 2022, 11720, 1),
('juan-lebron', 2021, 12720, 1),
('alejandro-galan-romo', 2022, 11720, 1);

-- tournament_teams
INSERT INTO tournament_teams
(`tournament`, `team`)
VALUES
('estrella-damm-menorca-open-2022', 1),
('estrella-damm-menorca-open-2022', 2),
('estrella-damm-menorca-open-2022', 3);

-- tournament_phases
INSERT INTO tournament_phases
(`name`)
VALUES
('main_draw');

-- tournament_rounds
INSERT INTO tournament_rounds
(`name`)
VALUES
('semi'),
('final');

-- matches
INSERT INTO matches
(`first_team`, `second_team`, `tournament`, `phase`, `round`, `category`)
VALUES
(1, 2, 'estrella-damm-menorca-open-2022', 'main_draw', 'semi', 'male'),
(1, 3, 'estrella-damm-menorca-open-2022', 'main_draw', 'final', 'male');

-- set_results
INSERT INTO set_results
(`match`, `set`, `first_team_res`, `second_team_res`)
VALUES
(1, '1', 6, 0),
(1, '2', 6, 4),
(2, '1', 6, 4),
(2, '2', 3, 6),
(2, '3', 1, 6);