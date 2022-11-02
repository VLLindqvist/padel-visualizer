import cv2
import os
import numpy as np
import torch
from basicsr.utils import img2tensor, tensor2img
from basicsr.utils.download_util import load_file_from_url
from facexlib.utils.face_restoration_helper import FaceRestoreHelper
from torchvision.transforms.functional import normalize
from PIL import Image
from basicsr.archs.rrdbnet_arch import RRDBNet

from gfpgan.gfpganv1_clean import GFPGANv1Clean
from gfpgan.real_esrgan import RealESRGANer

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class GFPGANer():
    """Helper for restoration with GFPGAN.

    It will detect and crop faces, and then resize the faces to 512x512.
    GFPGAN is used to restored the resized faces.
    The background is upsampled with the bg_upsampler.
    Finally, the faces will be pasted back to the upsample background image.

    Args:
        model_path (str): The path to the GFPGAN model. It can be urls (will first download it automatically).
        upscale (float): The upscale of the final output. Default: 2.
        arch (str): The GFPGAN architecture. Option: clean | original. Default: clean.
        channel_multiplier (int): Channel multiplier for large networks of StyleGAN2. Default: 2.
        bg_upsampler (nn.Module): The upsampler for the background. Default: None.
    """

    def __init__(self, model_path, bg_model_path, upscale=2, channel_multiplier=2, device=None):
        self.upscale = upscale
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        netscale = 4
        self.bg_upsampler = RealESRGANer(
            scale=netscale,
            model_path=bg_model_path,
            dni_weight=None,
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False,
            gpu_id=None
        )

        # initialize model
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu') if device is None else device
        # initialize the GFP-GAN
        self.gfpgan = GFPGANv1Clean(
            out_size=512,
            num_style_feat=512,
            channel_multiplier=channel_multiplier,
            decoder_load_path=None,
            fix_decoder=False,
            num_mlp=8,
            input_is_latent=True,
            different_w=True,
            narrow=1,
            sft_half=True)
        # initialize face helper
        self.face_helper = FaceRestoreHelper(
            upscale,
            face_size=512,
            crop_ratio=(1, 1),
            det_model='retinaface_resnet50',
            save_ext='png',
            use_parse=True,
            device=self.device,
            model_rootpath='gfpgan/weights')

        if model_path.startswith('https://'):
            model_path = load_file_from_url(
                url=model_path, model_dir=os.path.join(ROOT_DIR, 'gfpgan/weights'), progress=True, file_name=None)
        loadnet = torch.load(model_path)
        if 'params_ema' in loadnet:
            keyname = 'params_ema'
        else:
            keyname = 'params'
        self.gfpgan.load_state_dict(loadnet[keyname], strict=True)
        self.gfpgan.eval()
        self.gfpgan = self.gfpgan.to(self.device)

    # def paste_face_in_image(self) -> bytes:
    #     h, w, _ = self.face_helper.input_img.shape
    #     h_up, w_up = int(h * self.face_helper.upscale_factor), int(w * self.face_helper.upscale_factor)

    #     # simply resize the background
    #     upsample_img = cv2.resize(self.face_helper.input_img, (w_up, h_up), interpolation=cv2.INTER_LANCZOS4)

    #     restored_face = self.face_helper.restored_faces[-1]
    #     inverse_affine = self.face_helper.get_inverse_affine()
    #     inverse_affine = self.face_helper.inverse_affine_matrices[0]

    #     # Add an offset to inverse affine matrix, for more precise back alignment
    #     if self.face_helper.upscale_factor > 1:
    #         extra_offset = 0.5 * self.face_helper.upscale_factor
    #     else:
    #         extra_offset = 0
    #     inverse_affine[:, 2] += extra_offset
    #     inv_restored = cv2.warpAffine(restored_face, inverse_affine, (w_up, h_up))

    #     mask = np.ones(self.face_helper.face_size, dtype=np.float32)
    #     inv_mask = cv2.warpAffine(mask, inverse_affine, (w_up, h_up))
    #     # remove the black borders
    #     inv_mask_erosion = cv2.erode(
    #         inv_mask, np.ones((int(2 * self.face_helper.upscale_factor), int(2 * self.face_helper.upscale_factor)), np.uint8))
    #     pasted_face = inv_mask_erosion[:, :, None] * inv_restored
    #     total_face_area = np.sum(inv_mask_erosion)  # // 3
    #     # compute the fusion edge based on the area of face
    #     w_edge = int(total_face_area**0.5) // 20
    #     erosion_radius = w_edge * 2
    #     inv_mask_center = cv2.erode(inv_mask_erosion, np.ones((erosion_radius, erosion_radius), np.uint8))
    #     blur_size = w_edge * 2
    #     inv_soft_mask = cv2.GaussianBlur(inv_mask_center, (blur_size + 1, blur_size + 1), 0)
    #     if len(upsample_img.shape) == 2:  # upsample_img is gray image
    #         upsample_img = upsample_img[:, :, None]
    #     inv_soft_mask = inv_soft_mask[:, :, None]

    #     if len(upsample_img.shape) == 3 and upsample_img.shape[2] == 4:  # alpha channel
    #         alpha = upsample_img[:, :, 3:]
    #         upsample_img = inv_soft_mask * pasted_face + (1 - inv_soft_mask) * upsample_img[:, :, 0:3]
    #         upsample_img = np.concatenate((upsample_img, alpha), axis=2)
    #     else:
    #         upsample_img = inv_soft_mask * pasted_face + (1 - inv_soft_mask) * upsample_img

    #     upsample_img = upsample_img.astype(np.uint8)

    #     return cv2.imencode('.png', upsample_img)[1].tobytes()

    @torch.no_grad()
    def enhance(self, img, weight=0.5):
        self.face_helper.clean_all()

        self.face_helper.read_image(img)
        # get face landmarks for each face
        self.face_helper.get_face_landmarks_5(only_center_face=True, eye_dist_threshold=5)
        # eye_dist_threshold=5: skip faces whose eye distance is smaller than 5 pixels
        # align and warp each face
        self.face_helper.align_warp_face()

        # face restoration
        for cropped_face in self.face_helper.cropped_faces:
            # prepare data
            cropped_face_t = img2tensor(cropped_face / 255., bgr2rgb=False, float32=True)
            normalize(cropped_face_t, (0.5, 0.5, 0.5), (0.5, 0.5, 0.5), inplace=True)
            cropped_face_t = cropped_face_t.unsqueeze(0).to(self.device)

            try:
                output = self.gfpgan(cropped_face_t, return_rgb=True, weight=weight)[0]
                # convert to image
                restored_face = tensor2img(output.squeeze(0), rgb2bgr=False, min_max=(-1, 1))
            except RuntimeError as error:
                print(f'\tFailed inference for GFPGAN: {error}.')
                restored_face = cropped_face

            restored_face = restored_face.astype('uint8')
            self.face_helper.add_restored_face(restored_face)

        bg_img = self.bg_upsampler.enhance(img, outscale=self.upscale)[0]

        self.face_helper.get_inverse_affine()
        # self.bg_upsampler
        im_rgb = cv2.cvtColor(self.face_helper.paste_faces_to_input_image(upsample_img=bg_img), cv2.COLOR_BGR2RGB)
        return Image.fromarray(im_rgb)
        