import getPort, { portNumbers } from 'get-port';
import { getAvailableUdpPort } from './udpPorts.js';
import fs from 'fs';
import path from 'path';
import Docker from 'dockerode';
import { IP_PUBLICO_SERVER, con_config_path } from './config.js';






export async function getPorts() {
    const rtspAddress = await getPort({port: portNumbers(8554, 8564)});
    let pair_is_set = false;
    let rtpAddress=8000; 
    let rtcpAddress;
    const max_rtpAddress = 8020;
    let noPorts = false;


    while(!pair_is_set && !noPorts){
        //rtpAddress = await getPort({port: portNumbers(rtpAddress, max_rtpAddress)});
        rtpAddress = await getAvailableUdpPort({portRange: [rtpAddress, max_rtpAddress]})
        if(!rtpAddress){ //se nao encontrar porta para
            noPorts = true;
            break;
        }
        rtcpAddress = await getAvailableUdpPort({portRange: [rtpAddress + 1, rtpAddress + 1]})
        if(!rtcpAddress){
            rtpAddress += 2;
        }
        else pair_is_set = true;
        if(rtpAddress > max_rtpAddress - 1){
            noPorts = true;
        }
    }
    if(noPorts){
        return false;
    }
    else{
        const ports = {
            rtspAddress: rtspAddress, 
            rtpAddress: rtpAddress, 
            rtcpAddress: rtcpAddress,
        }
       
        return ports;
    }
}



export function createYml(name, ip, ports, tipo){

    try{
        fs.copyFileSync(path.join(con_config_path, 'default.yml'), path.join(con_config_path, `${name}.yml`));
    }
    catch (err) {
        console.log("Erro ao copiar default", err);
        return false;
    }
    let psw, url_source;
    if(tipo === 'DVR'){
        let stream_number = name.split('_')[1];
        psw = "wnidobrasil22";
        //url_source = `source: rtsp://mat:wnidobrasil22@${ip}:554/Streaming/Channels/${stream_number}`;
        url_source = `rtsp://mat:wnidobrasil22@${ip}:554`;
        //source: rtsp://admin:${psw}@${ip}
    }
    else if (tipo === 'LPR'){
        psw = encodeURIComponent("Wnidobrasil#22")
        url_source = `rtsp://admin:${psw}@${ip}:554/cam/realmonitor?channel=1&subtype=1`;
        console.log("LPR URL:", url_source);
    }
    else{
        //psw = encodeURIComponent("Wnidobrasil#22")
        psw = encodeURIComponent("Wnidobrasil#22");
        //url_source = `rtsp://bosch:${psw}@${ip}:25552`;
        url_source = `rtsp://admin:${psw}@${ip}:554/Streaming/Channels/102`;
    }
    let url_source_dest = `rtsp://admin:${psw}@${IP_PUBLICO_SERVER}:${ports.rtspAddress}/${name}`
    let runOnReady = `ffmpeg -i ${url_source} -f rtsp ${url_source_dest}`;

    const content = `\nrtspAddress: :${ports.rtspAddress}\nrtpAddress: :${ports.rtpAddress}\nrtcpAddress: :${ports.rtcpAddress}\npaths:\n  ${name}:\n    source: ${url_source}\n    sourceProtocol: tcp\n    sourceOnDemand: yes`;  
    
    //console.log(url_source_dest);

    try {
        const fileName = path.join(con_config_path,`${name}.yml` );
        fs.appendFileSync(fileName, content);
        return fileName;
    } catch (error) {
        console.log("Error overwriting file", error);
        return false;
    }
}