import {Client} from '@stomp/stompjs';import SockJS from 'sockjs-client';
let client;
export function connectRealtime(onMessage){client=new Client({webSocketFactory:()=>new SockJS('/ws'),reconnectDelay:3000,onConnect:()=>{client.subscribe('/topic/requests',m=>onMessage(JSON.parse(m.body)));}});client.activate();return ()=>client?.deactivate();}
export function watchTracking(bookingId){client?.publish({destination:'/app/tracking/watch',body:JSON.stringify({bookingId})});}
