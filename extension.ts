import { initialize, type ActivationContext, MidiClip, MidiTrack } from "@ableton-extensions/sdk";

const TRANSPOSE_COMMAND = "transpose";
const TRANSPOSE_TITLE = "down a semitone";
const transposeBy = -1;

export async function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");
  await registerTransposeMenu(context);
}

async function registerTransposeMenu(context: ReturnType<typeof initialize>) {
  context.commands.registerCommand(TRANSPOSE_COMMAND, () => {
    const { song } = context.application;
    context.withinTransaction(() => processMidiTracks(song, transposeBy));
  });

  await context.ui.registerContextMenuAction(
    "MidiTrack",
    TRANSPOSE_TITLE,
    TRANSPOSE_COMMAND,
  );
}

function processMidiTracks(
  song: ReturnType<typeof initialize>["application"]["song"],
  semitones: number,
) {
  for (const track of song.tracks) {
    if (!(track instanceof MidiTrack)) continue;
    if (isExcluded(track)) continue;
    processMidiClipsOnTrack(track, semitones);
  }
}

function isExcluded(track: MidiTrack<"1.0.0">): boolean {
  return /\bexclude\b/i.test(track.name);
}

function processMidiClipsOnTrack(track: MidiTrack<"1.0.0">, semitones: number) {
  for (const clip of findAllClips(track)) {
    if (clip instanceof MidiClip) {
      transposeMidiNotesInClip(clip, semitones);
    }
  }
}

function* findAllClips(track: MidiTrack<"1.0.0">) {
  yield* track.arrangementClips;

  for (const slot of track.clipSlots) {
    if (slot.clip) yield slot.clip; // skip empty slots
  }

  for (const lane of track.takeLanes) {
    yield* lane.clips;
  }
}

function transposeMidiNotesInClip(clip: MidiClip<"1.0.0">, semitones: number) {
  clip.notes = clip.notes.map((note) => ({
    ...note,
    pitch: Math.max(0, Math.min(127, note.pitch + semitones)),
  }));
}