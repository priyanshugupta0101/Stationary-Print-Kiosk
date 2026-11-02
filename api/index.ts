import type { Request, Response } from 'express';
import { createExpressApp } from '../server.ts';

let appInstance: any = null;

export default async function handler(req: Request, res: Response) {
  if (!appInstance) {
    appInstance = await createExpressApp();
  }
  return appInstance(req, res);
}
