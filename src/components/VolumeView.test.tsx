// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VolumeView, type VolumeRow } from './VolumeView';
import { landmarksFor } from '../lib/volumeLandmarks';

const chest = landmarksFor('pectorals'); // mev 9, mav 16, mrv 22

describe('VolumeView (VOLUME.md — information, not a target to max)', () => {
  it('shows sets landed against the MEV–MRV band', () => {
    const rows: VolumeRow[] = [{ muscle: 'pectorals', hardSets: 12, landmarks: chest }];
    render(<VolumeView rows={rows} />);
    expect(screen.getByText('Pectorals')).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/9–22/)).toBeInTheDocument(); // MEV–MRV band, not "0–max"
  });

  it('frames MRV as a ceiling to respect, never a target to fill', () => {
    render(<VolumeView rows={[{ muscle: 'pectorals', hardSets: 12, landmarks: chest }]} />);
    // Explicitly tells the user more is not better past the range.
    expect(screen.getByText(/ceiling to respect, not a target/i)).toBeInTheDocument();
    expect(screen.getByText(/more isn't better/i)).toBeInTheDocument();
  });

  it('over-MRV reads as "back off", not as success', () => {
    render(<VolumeView rows={[{ muscle: 'pectorals', hardSets: 24, landmarks: chest }]} />);
    expect(screen.getByText(/over your ceiling — back off/i)).toBeInTheDocument();
  });

  it('below-MEV reads as below the growth range (not a filled bar)', () => {
    render(<VolumeView rows={[{ muscle: 'pectorals', hardSets: 5, landmarks: chest }]} />);
    expect(screen.getByText(/below growth range/i)).toBeInTheDocument();
  });
});
