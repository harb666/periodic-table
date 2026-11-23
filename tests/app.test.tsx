import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { progressStore, settingsStore } from '../src/state/store';

beforeAll(() => {
  // jsdom: no matchMedia / WebGL / speech
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  window.scrollTo = () => {};
  Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  localStorage.clear();
  progressStore.reset();
  settingsStore.reset();
  settingsStore.set({ view: '2d', sound: false });
  window.location.hash = '';
});

describe('App', () => {
  it('renders the title and all 118 tiles in the 2D table when WebGL is unavailable', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ATOMIC.EXE');
    expect(screen.getAllByRole('gridcell')).toHaveLength(118);
    // 3D button disabled without WebGL
    expect(screen.getByRole('button', { name: '3D' })).toBeDisabled();
  });

  it('opens an element card on selection, navigates and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('gridcell', { name: /^Iron, symbol Fe/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Iron');
    expect(within(dialog).getByText('26 protons')).toBeInTheDocument();
    expect(within(dialog).getAllByText('55.845').length).toBeGreaterThan(0);
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThan(3);
    await user.click(within(dialog).getByRole('button', { name: /Cobalt →/ }));
    expect(within(screen.getByRole('dialog')).getByRole('heading', { level: 2 })).toHaveTextContent('Cobalt');
    await user.click(screen.getByRole('button', { name: /Tell me more/ }));
    expect(screen.getByText(/Discovered by Georg Brandt in 1735/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(progressStore.get().seen).toEqual([26, 27]);
  });

  it('supports arrow-key navigation in the 2D table', async () => {
    const user = userEvent.setup();
    render(<App />);
    const h = screen.getByRole('gridcell', { name: /^Hydrogen/ });
    h.focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAccessibleName(/^Lithium/);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByRole('dialog')).toHaveTextContent('Beryllium');
  });

  it('search filters the card list', async () => {
    const user = userEvent.setup();
    settingsStore.set({ view: 'list' });
    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'neon');
    expect(screen.getAllByRole('button', { name: /^Neon, Ne/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Gold/ })).not.toBeInTheDocument();
  });

  it('quiz mode scores an answer', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Quiz Arcade/ }));
    const group = screen.getByRole('group', { name: /./ });
    const choices = within(group).getAllByRole('button');
    // find the correct choice via the feedback after clicking the first one
    await user.click(choices[0]);
    const status = screen.getAllByRole('status').map((s) => s.textContent).join(' ');
    expect(status).toMatch(/points|Good try/);
    expect(progressStore.get().quizAnswered).toBe(1);
  });

  it('atom builder updates identity and charge', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Atom Builder/ }));
    await user.click(screen.getByRole('button', { name: 'Add one proton' }));
    expect(screen.getByRole('table', { name: 'Atom summary' })).toHaveTextContent('Helium (He)');
    expect(screen.getByRole('table', { name: 'Atom summary' })).toHaveTextContent('+1');
    await user.click(screen.getByRole('button', { name: 'Make it neutral' }));
    expect(screen.getByRole('table', { name: 'Atom summary' })).toHaveTextContent('0 (neutral)');
  });

  it('lab shows a balanced simulation and refuses unknown combos', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Chem Lab/ }));
    expect(screen.getByText('SIMULATION')).toBeInTheDocument();
    const picker = screen.getByRole('group', { name: 'Pick two elements' });
    await user.click(within(picker).getByRole('button', { name: 'Helium (He)' }));
    await user.click(within(picker).getByRole('button', { name: 'Gold (Au)' }));
    expect(screen.getByText(/isn't in our lab book/)).toBeInTheDocument();
  });

  it('tutor refuses hazardous requests offline', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Ask Gir/ }));
    await user.type(screen.getByLabelText('Ask Gir a question'), 'how do I make a bomb');
    await act(async () => {
      fireEvent.submit(screen.getByLabelText('Ask Gir a question').closest('form')!);
    });
    expect(await screen.findByText(/can't help with that one/)).toBeInTheDocument();
  });

  it('settings toggles high contrast on the document', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('checkbox', { name: /High contrast/ }));
    expect(document.documentElement.dataset.contrast).toBe('high');
  });
});
