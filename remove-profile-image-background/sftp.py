from io import BytesIO
import pysftp
import os


class Sftp:
    def __init__(self, hostname, username, password=None, privateKey=None, port=22):
        """Constructor Method"""
        # Set connection object to None (initial value)
        self.connection = None
        self.hostname = hostname
        self.username = username
        self.privateKey = privateKey
        self.password = password
        self.port = port

    def connect(self):
        """Connects to the sftp server and returns the sftp connection object"""

        try:
            # Get the sftp connection object
            if self.privateKey is not None:
                self.connection = pysftp.Connection(
                    host=self.hostname,
                    username=self.username,
                    private_key=self.privateKey,
                    port=self.port,
                )
            else:
                self.connection = pysftp.Connection(
                    host=self.hostname,
                    username=self.username,
                    password=self.password,
                    port=self.port,
                )
        except Exception as err:
            raise Exception(err)
        finally:
            print(f"Connected to {self.hostname} as {self.username}.")

    def disconnect(self):
        """Closes the sftp connection"""
        self.connection.close()
        print(f"Disconnected from host {self.hostname}")

    def listDir(self, remotePath):
        """lists all the files and directories in the specified path and returns them"""
        for obj in self.connection.listdir(remotePath):
            yield obj

    def download(self, remotePath, targetLocalPath):
        """
        Downloads the file from remote sftp server to local.
        Also, by default extracts the file to the specified targetLocalPath
        """

        try:
            print(
                f"Downloading from {self.hostname} as {self.username} [(remote path : {remotePath});(local path: {targetLocalPath})]"
            )

            # Create the target directory if it does not exist
            path, _ = os.path.split(targetLocalPath)
            if not os.path.isdir(path):
                try:
                    os.makedirs(path)
                except Exception as err:
                    raise Exception(err)

            # Download from remote sftp server to local
            self.connection.get(remotePath, targetLocalPath)
            print("Download complete")

        except Exception as err:
            raise Exception(err)

    def uploadFromMemory(self, sourceBlob: bytes, remotePath: str):
        """
        Uploads the source files from local to the sftp server.
        """

        try:
            # print(
            #     f"Uploading to {self.hostname} as {self.username} [(remote path: {remotePath})]"
            # )

            self.connection.putfo(BytesIO(sourceBlob), remotePath)
            # print("Upload from memory complete")

        except Exception as err:
            print("Couldn't upload from memory: \n", err)

    def uploadFromPath(self, sourceLocalPath, remotePath):
        """
        Uploads the source files from local to the sftp server.
        """

        try:
            print(
                f"Uploading to {self.hostname} as {self.username} [(remote path: {remotePath});(source local path: {sourceLocalPath})]"
            )

            self.connection.put(sourceLocalPath, remotePath)
            print("Upload from disk complete")

        except Exception as err:
            print("Couldn't upload from disk: \n", err)
