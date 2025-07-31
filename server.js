import express from 'express';
import cors from 'cors';
import { handleRequest } from './main.js';
import { IP, containerAgingTime, cleanerIntervalTime } from './config.js';

const HTTP_PORT = 2222;

export function createServer(){

    setInterval(() => getAllContainers(containerAgingTime), cleanerIntervalTime);

    const app = express();
    const corsOptions = {
        origin: '*',
        methods: ['GET', 'POST']
    }
    app.use(cors(corsOptions));

    app.use(express.json({type: 'application/json'}));



    app.get('/api/getRTSP_URL', async (req, res) => {
        const ip = req.query.ip;
        const ponto = req.query.ponto;
        const tipo = req.query.tipo;

        const ports = await handleRequest(ponto, ip, tipo);
        if (ports) {
            const url_rtsp = `rtsp://${IP}:${ports.rtspAddress}/${ponto}`;
            res.status(200).json({
                message: 'URL RTSP gerada com sucesso',
                url: url_rtsp,
                ports: ports
            });
        }
        else {
            res.status(500).json({
                message: 'Erro ao gerar URL RTSP'
            });
        }
    })
    return app;
}


const serverHTTP = createServer();
const procSHttp = serverHTTP.listen(HTTP_PORT, () => {
      console.log(`\n Server HTTP rodando em http://localhost:${HTTP_PORT}`);

    });