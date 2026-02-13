import { render, screen } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton Component', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('presentation');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton');
  });

  it('applies variant classes', () => {
    render(<Skeleton variant="rectangular" />);
    const skeleton = screen.getByRole('presentation');
    expect(skeleton).toHaveClass('skeleton-rectangular');
  });

  it('applies custom dimensions', () => {
    render(<Skeleton width={200} height={100} />);
    const skeleton = screen.getByRole('presentation');
    expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
  });

  it('handles text variant', () => {
    render(<Skeleton variant="text" />);
    const skeleton = screen.getByRole('presentation');
    expect(skeleton).toHaveClass('skeleton-text');
  });

  it('handles circular variant', () => {
    render(<Skeleton variant="circular" />);
    const skeleton = screen.getByRole('presentation');
    expect(skeleton).toHaveClass('skeleton-circular');
  });

  it('applies animation classes', () => {
    render(<Skeleton animation="wave" />);
    const skeleton = screen.getByRole('presentation');
    expect(skeleton).toHaveClass('skeleton-wave');
  });
});