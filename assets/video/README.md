# Motion backgrounds

Empty on purpose. While `manifest.json` names no clips, the **Format** field is
hidden entirely and the tool offers stills only — better than a Video tab that
opens an empty picker.

Add a clip and the field reappears by itself:

```json
{
  "hamburg": [
    { "file": "hamburg-1.mp4", "label": "Harbour", "poster": "poster-hamburg-1.jpg" }
  ],
  "_shared": [
    { "file": "fi-background.mp4", "label": "Motion", "poster": "poster-1.jpg" }
  ]
}
```

`poster` is a still shown as the picker thumbnail — the clips themselves are
never fetched to draw the list.

Keep clips **portrait, H.264/MP4, a few seconds, silent, and under about 6 MB**.
Every byte is downloaded in the visitor's browser before an export can run, and
the MP4 encode itself is roughly real time.
