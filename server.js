import express from 'express';
import cors from 'cors';
import { handleRequest, getAllContainers, removeSomeStreams, removeStream } from './main.js';
import { IP, containerAgingTime, cleanerIntervalTime } from './config.js';

const HTTP_PORT = 2222;

export function createServer(){

    //setInterval(() => getAllContainers(containerAgingTime), cleanerIntervalTime);

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
            console.log(url_rtsp);
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

    app.get('/api/removeStreams', async (req, res) => {
        const con_lst = req.query;
        console.log(con_lst);
        const lst = con_lst['streams_lst[]'];
        const resp = await removeSomeStreams(lst);
        if(resp){
            res.status(200).json({
                message: "Streams excluidas"
            })
        }
        else{
            res.status(500).json({
                message: "Erro"
            })
        }
    })

    app.get('/api/removeStream', async (req, res) => {
        const ponto = req.query.ponto;
        await removeStream(ponto);
        res.status(200).json({message: 'aaaaa'});
    })

    return app;
}


const serverHTTP = createServer();
const procSHttp = serverHTTP.listen(HTTP_PORT, () => {
      console.log(`\n Server HTTP rodando em http://localhost:${HTTP_PORT}`);

    });