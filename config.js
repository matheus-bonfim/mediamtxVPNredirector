import { fileURLToPath } from 'url';
import path from 'path';


export const containerAgingTime = 1000 * 3600 * 2;
export const cleanerIntervalTime = 1000 * 60 * 20;
export const IP_PUBLICO_SERVER = '189.4.2.61';

export const con_config_path = './containers_config';

const __filename = fileURLToPath(import.meta.url);

export const __dirname = path.dirname(__filename);

export const IP = "192.168.10.226";