import React, { useState, useEffect, useRef } from "react";
import * as faceapi from '@vladmandic/face-api';

function calculateScore(expressions, mouth_opening, diffX, diffY){
  let body_mvmt = (diffX + diffY) / 20 > 1 ? 1 : (diffX + diffY) / 20
  let laugh_score = mouth_opening > 1 ? 1 : mouth_opening
  let other_expressions = expressions.surprised * 0.2 - expressions.angry * 0.5 - expressions.disgusted * 0.5 - expressions.fearful * 0.3 - expressions.sad * 0.8;
  return 100 * (expressions.happy * 0.5 + laugh_score * 0.4 + body_mvmt * 0.1 + other_expressions)
}

const Player = ({ isLocalParticipant, player, socket, roomSid, inGame }) => {
  const [videoTracks, setVideoTracks] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const videoRef = useRef();
  const audioRef = useRef();
  
  const trackpubsToTracks = (trackMap) =>
    Array.from(trackMap.values())
      .map((publication) => publication.track)
      .filter((track) => track !== null);
	useEffect(() => {
		if (!isLocalParticipant) return;

		var prevX = 100
    var prevY = 100
    let reference_size = 0
    let cur_score;
    let flag = false
    var interval
    if (inGame) {
      interval = setInterval(async () => {
        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
        if (!detections[0]) return;
        let diffX = Math.abs(prevX - detections[0].detection._box.x )
        let diffY = Math.abs(prevY - detections[0].detection._box.y )
        prevX = detections[0].detection._box.x
        prevY = detections[0].detection._box.y
        let mouth_size = detections[0].landmarks.positions[57].y - detections[0].landmarks.positions[51].y
        if (!flag) {
          reference_size = mouth_size - 8
          flag = true
        }
        cur_score = calculateScore(detections[0].expressions, (mouth_size - reference_size) * 0.05, diffX, diffY)
        socket.emit('process_score', {cur_score: cur_score, roomSid: roomSid})
        console.log("Sent")
        socket.on('turn-finished', () => clearInterval(interval))
        socket.on('game-ended', () => clearInterval(interval))
      }, 1000)
    }
	})

  useEffect(() => {
    setVideoTracks(trackpubsToTracks(player.videoTracks));
    setAudioTracks(trackpubsToTracks(player.audioTracks));

    const trackSubscribed = (track) => {
      if (track.kind === "video") {
        setVideoTracks((videoTracks) => [...videoTracks, track]);
      } else if (track.kind === "audio") {
        setAudioTracks((audioTracks) => [...audioTracks, track]);
      }
    };

    const trackUnsubscribed = (track) => {
      if (track.kind === "video") {
        setVideoTracks((videoTracks) => videoTracks.filter((v) => v !== track));
      } else if (track.kind === "audio") {
        setAudioTracks((audioTracks) => audioTracks.filter((a) => a !== track));
      }
    };

    player.on("trackSubscribed", trackSubscribed);
    player.on("trackUnsubscribed", trackUnsubscribed);

    return () => {
      setVideoTracks([]);
      setAudioTracks([]);
      player.removeAllListeners();
    };
  }, [player]);

  useEffect(() => {
    const videoTrack = videoTracks[0];
    if (videoTrack) {
      videoTrack.attach(videoRef.current);
      return () => {
        videoTrack.detach();
      };
    }
  }, [videoTracks]);

  useEffect(() => {
    const audioTrack = audioTracks[0];
    if (audioTrack) {
      audioTrack.attach(audioRef.current);
      return () => {
        audioTrack.detach();
      };
    }
  }, [audioTracks]);
  return (
    <div className="player">
      <video ref={videoRef} autoPlay={true} style={{ transform: isLocalParticipant ? 'rotateY(180deg)' : '' }}/>
      <audio ref={audioRef} autoPlay={true} />
      <p style={{textAlign: 'center'}}>{player.identity}{isLocalParticipant && " (you)"}</p>
    </div>
  );
};

export default Player;
