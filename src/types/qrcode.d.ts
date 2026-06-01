declare module "qrcode" {
  const QRCode: {
    toDataURL: (
      text: string,
      options?: {
        errorCorrectionLevel?: string;
        margin?: number;
        scale?: number;
        color?: {
          dark?: string;
          light?: string;
        };
      },
    ) => Promise<string>;
  };

  export default QRCode;
}
