import { Song, QueueState } from '@/types';
import { EventEmitter } from 'events';

class QueueManager extends EventEmitter {
  private state: QueueState = {
    songs: [],
    currentIndex: -1,
    isPlaying: false
  };

  getState(): QueueState {
    return { ...this.state };
  }

  addSong(song: Song): void {
    this.state.songs.push(song);
    console.log('Song added to queue:', song.title, 'Total songs:', this.state.songs.length, 'CurrentIndex:', this.state.currentIndex);
    console.log('Emitting update event, listeners:', this.listenerCount('update'));
    const stateCopy = this.getState();
    this.emit('update', stateCopy);
    this.emit('song_added', song);
  }

  removeSong(songId: string): void {
    const index = this.state.songs.findIndex(s => s.id === songId);
    if (index === -1) return;

    const [removed] = this.state.songs.splice(index, 1);
    
    if (index < this.state.currentIndex) {
      this.state.currentIndex--;
    } else if (index === this.state.currentIndex) {
      this.state.currentIndex--;
    }

    this.emit('update', this.state);
    this.emit('song_removed', removed);
  }

  playNext(): Song | null {
    if (this.state.currentIndex + 1 < this.state.songs.length) {
      this.state.currentIndex++;
      const song = this.state.songs[this.state.currentIndex];
      this.state.isPlaying = true;
      this.emit('update', this.state);
      this.emit('current_changed', song);
      return song;
    }
    return null;
  }

  playPrevious(): Song | null {
    if (this.state.currentIndex - 1 >= 0) {
      this.state.currentIndex--;
      const song = this.state.songs[this.state.currentIndex];
      this.state.isPlaying = true;
      this.emit('update', this.state);
      this.emit('current_changed', song);
      return song;
    }
    return null;
  }

  playSongAt(index: number): Song | null {
    if (index >= 0 && index < this.state.songs.length) {
      this.state.currentIndex = index;
      const song = this.state.songs[index];
      this.state.isPlaying = true;
      this.emit('update', this.state);
      this.emit('current_changed', song);
      return song;
    }
    return null;
  }

  setPlayingState(isPlaying: boolean): void {
    this.state.isPlaying = isPlaying;
    this.emit('update', this.state);
    this.emit('playback_state', isPlaying);
  }

  removeCurrentAndMoveNext(): Song | null {
    const currentSong = this.getCurrentSong();
    if (!currentSong) {
      console.log('removeCurrentAndMoveNext: No current song to remove');
      return null;
    }
    
    console.log('removeCurrentAndMoveNext: Removing song:', currentSong.title, 'at index:', this.state.currentIndex);
    console.log('Queue before removal:', this.state.songs.map(s => s.title));
    
    // Remove current song from queue
    this.state.songs.splice(this.state.currentIndex, 1);
    
    console.log('Queue after removal:', this.state.songs.map(s => s.title));
    
    // Current index now points to what was the next song
    // If we're past the end, there's no next song
    if (this.state.currentIndex >= this.state.songs.length) {
      this.state.currentIndex = -1;
      this.state.isPlaying = false;
      console.log('No more songs in queue');
    } else {
      console.log('Next song:', this.state.songs[this.state.currentIndex]?.title);
    }
    
    this.emit('update', this.state);
    this.emit('song_removed', currentSong);
    
    const nextSong = this.getCurrentSong();
    if (nextSong) {
      this.emit('current_changed', nextSong);
    }
    return nextSong;
  }

  getCurrentSong(): Song | null {
    if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.songs.length) {
      return this.state.songs[this.state.currentIndex];
    }
    return null;
  }

  clearQueue(): void {
    this.state.songs = [];
    this.state.currentIndex = -1;
    this.state.isPlaying = false;
    this.emit('update', this.state);
  }
}

// Use global to ensure singleton across all module contexts in Next.js
const globalForQueue = global as typeof globalThis & {
  queueManager?: QueueManager;
};

export const queueManager = globalForQueue.queueManager ?? new QueueManager();

if (process.env.NODE_ENV !== 'production') {
  globalForQueue.queueManager = queueManager;
}
