"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const room_1 = require("@skyway-sdk/room");
// SkyWay SDK に接続するためのトークンを生成
const token = new room_1.SkyWayAuthToken({
    jti: (0, room_1.uuidV4)(),
    iat: (0, room_1.nowInSec)(),
    exp: (0, room_1.nowInSec)() + 60 * 60 * 24,
    scope: {
        app: {
            id: (_a = process.env.APPLICATION_ID) !== null && _a !== void 0 ? _a : "",
            turn: true,
            actions: ["read"],
            channels: [
                {
                    id: "*",
                    name: "*",
                    actions: ["write"],
                    members: [
                        {
                            id: "*",
                            name: "*",
                            actions: ["write"],
                            publication: {
                                actions: ["write"],
                            },
                            subscription: {
                                actions: ["write"],
                            },
                        },
                    ],
                    sfuBots: [
                        {
                            actions: ["write"],
                            forwardings: [
                                {
                                    actions: ["write"],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
}).encode((_b = process.env.SECRET_KEY) !== null && _b !== void 0 ? _b : "");
// 即時関数で実行
(() => __awaiter(void 0, void 0, void 0, function* () {
    // DOM要素を取得
    const buttonArea = document.getElementById("button-area");
    const remoteMediaArea = document.getElementById("remote-media-area");
    const roomNameInput = document.getElementById("room-name");
    const myId = document.getElementById("my-id");
    const joinButton = document.getElementById("join");
    const localVideo = document.getElementById("local-video");
    // ローカルの音声とビデオストリームを取得
    const { audio, video } = yield room_1.SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
    // ローカルのビデオストリームを表示
    video.attach(localVideo);
    yield localVideo.play();
    // joinボタンがクリックされたときの処理
    joinButton.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
        // ルーム名が空の場合は処理をスキップ
        if (roomNameInput.value === "")
            return;
        // SkyWay SDK に接続
        const context = yield room_1.SkyWayContext.Create(token);
        // ルームが存在しない場合は作成、存在する場合はそのroomを取得
        const room = yield room_1.SkyWayRoom.FindOrCreate(context, {
            type: "p2p",
            name: roomNameInput.value,
        });
        // ルームに参加
        const me = yield room.join();
        // ルームに参加したユーザーのIDを表示
        myId.textContent = me.id;
        // ルームに参加したユーザーの音声とビデオストリームをpublish
        me.publish(audio);
        me.publish(video);
        const subscribeAndAttach = (publication) => {
            // 自分の発行したpublicationはsubscribeしない
            if (publication.publisher.id === me.id)
                return;
            // publisher.id と publication.contentType をラベルにしたボタンを作成
            const subscribeButton = document.createElement("button");
            subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
            buttonArea.appendChild(subscribeButton);
            // subscribeボタンがクリックされたときの処理
            subscribeButton.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
                // publicationをsubscribe
                const { stream } = yield me.subscribe(publication.id);
                if (stream instanceof room_1.RemoteDataStream)
                    return;
                // streamの種類に応じてaudio要素 or video要素を作成
                let newMedia;
                switch (stream.track.kind) {
                    case "audio":
                        newMedia = document.createElement("audio");
                        newMedia.controls = true;
                        newMedia.autoplay = true;
                        break;
                    case "video":
                        newMedia = document.createElement("video");
                        newMedia.playsInline = true;
                        newMedia.autoplay = true;
                        break;
                    default:
                        return;
                }
                // subscribeしたstreamをaudio要素 or video要素にセットして表示
                stream.attach(newMedia);
                remoteMediaArea.appendChild(newMedia);
            });
        };
        // ルームに存在するpublicationをsubscribe
        room.publications.forEach(subscribeAndAttach);
        // ルームに新しいpublicationが追加されたときの処理
        room.onStreamPublished.add((e) => {
            subscribeAndAttach(e.publication);
        });
    });
}))();
