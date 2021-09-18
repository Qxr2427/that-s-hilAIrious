import React, { useState, useEffect, useRef } from "react";
import * as faceapi from '@vladmandic/face-api';

function score(happy, surprised, diffX, diffY){
	let diffScore = 20
	if((diffX + diffY)/20 > 1){
		diffScore = 1
	}
	else{
		diffScore = (diffX + diffY)/20 
	}
	let surprisedScore = 20 
	if(surprised > 1){
		surprisedScore = 1
	}
	else{
		surprisedScore = surprised
	}
	return 100*(happy*0.5 + surprisedScore*0.4 + diffScore * 0.1)
}

function runningavg(arr){
	let avg = 0
	let count = arr.length
	var i 
	for (i = 0; i < arr.length; i++){
		try {
			avg += arr[i]
		} catch (error) {
			count--
		}
	}
	if (count === 0) return avg
	return avg/count
}

const Player = ({ isLocalParticipant, player, socket }) => {
  const [videoTracks, setVideoTracks] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);

  const videoRef = useRef();
  const audioRef = useRef();

  const trackpubsToTracks = (trackMap) =>
    Array.from(trackMap.values())
      .map((publication) => publication.track)
      .filter((track) => track !== null);

	// useEffect(() => {
	// 	if (!isLocalParticipant) return;

	// 	var prevX = 100
  //   var prevY = 100
  //   var running_average_array = [60, 60, 60, 60, 60]
  //   let flag = false
  //   let maxscore = 60
  //   let referenceMouth = 0
  //   let cur_average
  //   setInterval(async () => {
  //     const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()

	// 		if (!detections[0])	return;

  //     let diffX = Math.abs(prevX - detections[0].detection._box.x )
  //     let diffY = Math.abs(prevY - detections[0].detection._box.y )
  //     prevX = detections[0].detection._box.x
  //     prevY = detections[0].detection._box.y
  //     let happy = detections[0].expressions.happy
  //     let mouth = detections[0].landmarks.positions[57].y - detections[0].landmarks.positions[51].y

  //     console.log(happy)
  //     // console.log(diffX)
  //     // console.log(diffY)
  //     // console.log(mouth - referenceMouth)
  //     // console.log(referenceMouth)
  //     if(!flag){
  //       referenceMouth = mouth - 8
  //       flag=true
  //     }
  //     var cur_score = score(happy, (mouth - referenceMouth) * 0.042, diffX, diffY)
	// 		// console.log(cur_score);
      
  //     running_average_array.shift()
  //     running_average_array.push(cur_score)
  //     cur_average = runningavg(running_average_array)
  //     maxscore = Math.max (cur_average, maxscore)

  //     socket.emit('cur_score', {current_score: cur_average})
	// 	}, 500);
	// })

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
      <h3>{player.identity}</h3>
      <video ref={videoRef} autoPlay={true} />
      <audio ref={audioRef} autoPlay={true} />
    </div>
  );
};

export default Player;
