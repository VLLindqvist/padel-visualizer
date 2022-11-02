from io import BytesIO
import os
import cv2
import numpy as np
from rembg import remove
from PIL import Image
from dotenv import load_dotenv
import mysql.connector as mysql
import requests
from sftp import Sftp
from gfpgan import GFPGANer

IMAGE_SUFFIX = "_nobg.png"

load_dotenv()  # take environment variables from .env.

def getDb():
    db = mysql.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME"),
    )
    dbCursor = db.cursor()
    return (db, dbCursor)

def getImageUrls(idsWithImagesFromServer: list[str] = None):
    (db, dbCursor) = getDb()
    dbCursor.execute(
        "SELECT p.id, p.profile_image_url FROM players AS p WHERE p.profile_image_url IS NULL AND p.profile_image_url_wpt IS NOT NULL ORDER BY p.rank")
    # dbCursor.execute(
    #     "SELECT p.id, p.profile_image_url FROM players AS p WHERE p.profile_image_url IS NOT NULL AND p.id = 'juan-lebron'")
    res: list[str] = dbCursor.fetchall()
    db.close()
    if idsWithImagesFromServer is not None:
        res = [r for r in res if idsWithImagesFromServer.count(r[0]) == 0]
    return res

def updateImageUrls(ids: list[str]):
    (db, dbCursor) = getDb()
    for id in ids:
        dbCursor.execute(
            f"UPDATE players AS p SET p.profile_image_url='{id}{IMAGE_SUFFIX}' WHERE p.id = '{id}'"
        )
    db.commit()
    db.close()

def removeWptImage(id: str):
    (db, dbCursor) = getDb()
    dbCursor.execute(
        f"UPDATE players AS p SET p.profile_image_url_wpt=NULL WHERE p.id = '{id}'"
    )
    db.commit()
    db.close()

def restoreFace(restorer: GFPGANer, img: bytes) -> Image:
    imgTemp = cv2.imdecode(np.frombuffer(img, np.uint8), cv2.IMREAD_COLOR)
    restored = restorer.enhance(imgTemp)

    return restored

def convertToPng(im: Image):
    with BytesIO() as f:
        im = im.convert('RGBA')
        im.save(f, format='PNG')
        return f.getvalue()

def removeBackground(im: Image) -> Image:
    try:
        return remove(im, True, 240, 1)
    except OSError as err:
        print("Couldn't remove background: ", err)

sftp = Sftp(hostname=os.getenv("SSH_HOST"), username=os.getenv(
    "SSH_USER"), privateKey=os.getenv("SSH_PRIVATE_KEY_PATH"))
sftp.connect()

listedDir = sftp.listDir(os.getenv("SSH_REMOTE_DIR"))
idsWithImagesFromServer = [f.replace(IMAGE_SUFFIX, '') for f in listedDir]
updateImageUrls(idsWithImagesFromServer)

sqlDataArr = getImageUrls(idsWithImagesFromServer)

restorer = GFPGANer(
        model_path=os.path.abspath('gfpgan/models/GFPGANv1.4.pth'),
        bg_model_path=os.path.abspath('gfpgan/models/RealESRGAN_x4plus.pth'),
        upscale=2,
        channel_multiplier=2)

removeFromDataArr = []

for (id, url) in sqlDataArr:
    res = requests.get(url)
    if not res.ok:
        removeWptImage(id)
        removeFromDataArr.append(id)
        continue

    imgData = res.content
    restored = restoreFace(restorer, imgData)
    imageNoBackground = removeBackground(restored)

    # Convert to bytes and upload
    imageNoBackgroundBytes = convertToPng(imageNoBackground)
    sftp.uploadFromMemory(imageNoBackgroundBytes,
                          f'{os.getenv("SSH_REMOTE_DIR")}/{id}{IMAGE_SUFFIX}')

sftp.disconnect()

sqlDataArr = [d for d in sqlDataArr if removeFromDataArr.count(d) == 0]
updateImageUrls([id for (id, _) in sqlDataArr])
