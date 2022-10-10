CREATE TABLE players (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255),
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    points INT,
    rank INT,
    profile_image_url VARCHAR(500),
    profile_url VARCHAR(500),
    country INT,
    CONSTRAINT fk_players_countries
        FOREIGN KEY (country)
        REFERENCES countries(id)
);

CREATE TABLE countries (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY
    name VARCHAR(255),
    image_url VARCHAR(500),
);



-- player images
 CREATE TABLE player_images (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    player INT NOT NULL,
    image_url VARCHAR(500),
    CONSTRAINT fk_player_images_player
        FOREIGN KEY (player)
        REFERENCES players(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
 );


