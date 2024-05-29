import {
  nowInSec,
  RoomPublication,
  LocalStream,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  uuidV4,
  RemoteDataStream,
} from "@skyway-sdk/room";

// SkyWay SDK に接続するためのトークンを生成
const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  scope: {
    app: {
      id: process.env.APPLICATION_ID ?? "",
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
}).encode(process.env.SECRET_KEY ?? "");

// 即時関数で実行
(async () => {
  // DOM要素を取得
  const buttonArea = document.getElementById("button-area") as HTMLDivElement;
  const remoteMediaArea = document.getElementById(
    "remote-media-area"
  ) as HTMLDivElement;
  const roomNameInput = document.getElementById(
    "room-name"
  ) as HTMLInputElement;
  const myId = document.getElementById("my-id") as HTMLSpanElement;
  const joinButton = document.getElementById("join") as HTMLButtonElement;
  const localVideo = document.getElementById("local-video") as HTMLVideoElement;

  // ローカルの音声とビデオストリームを取得
  const { audio, video } =
    await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();

  // ローカルのビデオストリームを表示
  video.attach(localVideo);
  await localVideo.play();

  // joinボタンがクリックされたときの処理
  joinButton.onclick = async () => {
    // ルーム名が空の場合は処理をスキップ
    if (roomNameInput.value === "") return;

    // SkyWay SDK に接続
    const context = await SkyWayContext.Create(token);

    // ルームが存在しない場合は作成、存在する場合はそのroomを取得
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: "p2p",
      name: roomNameInput.value,
    });

    // ルームに参加
    const me = await room.join();

    // ルームに参加したユーザーのIDを表示
    myId.textContent = me.id;

    // ルームに参加したユーザーの音声とビデオストリームをpublish
    me.publish(audio);
    me.publish(video);

    const subscribeAndAttach = (publication: RoomPublication<LocalStream>) => {
      // 自分の発行したpublicationはsubscribeしない
      if (publication.publisher.id === me.id) return;

      // publisher.id と publication.contentType をラベルにしたボタンを作成
      const subscribeButton = document.createElement("button");
      subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
      buttonArea.appendChild(subscribeButton);

      // subscribeボタンがクリックされたときの処理
      subscribeButton.onclick = async () => {
        // publicationをsubscribe
        const { stream } = await me.subscribe(publication.id);
        if (stream instanceof RemoteDataStream) return;

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
      };
    };

    // ルームに存在するpublicationをsubscribe
    room.publications.forEach(subscribeAndAttach);

    // ルームに新しいpublicationが追加されたときの処理
    room.onStreamPublished.add((e) => {
      subscribeAndAttach(e.publication);
    });
  };
})();
