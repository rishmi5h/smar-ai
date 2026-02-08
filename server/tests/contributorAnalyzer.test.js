import { describe, it, expect } from 'vitest';
import { analyzeContributors } from '../src/services/contributorAnalyzer.js';

const makeCommit = (author, date = '2024-01-15T10:00:00Z', message = 'commit') => ({
  sha: 'abc1234',
  shortSha: 'abc1234',
  message,
  author,
  date
});

const makeFile = (filename, additions = 10, deletions = 5) => ({
  filename, status: 'modified', additions, deletions
});

describe('contributorAnalyzer', () => {
  describe('analyzeContributors', () => {
    it('returns correct structure', () => {
      const commits = [makeCommit('alice')];
      const files = [makeFile('src/app.js')];
      const result = analyzeContributors(commits, files);
      expect(result).toHaveProperty('authors');
      expect(result).toHaveProperty('fileOwnership');
      expect(result).toHaveProperty('activityTimeline');
      expect(result).toHaveProperty('summary');
    });

    it('handles empty commits', () => {
      const result = analyzeContributors([], []);
      expect(result.authors).toHaveLength(0);
      expect(result.summary.totalAuthors).toBe(0);
      expect(result.summary.topContributor).toBeNull();
    });

    it('handles null commits', () => {
      const result = analyzeContributors(null, []);
      expect(result.authors).toHaveLength(0);
    });

    it('counts authors correctly', () => {
      const commits = [
        makeCommit('alice'),
        makeCommit('bob'),
        makeCommit('alice')
      ];
      const result = analyzeContributors(commits, []);
      expect(result.authors).toHaveLength(2);
      expect(result.summary.totalAuthors).toBe(2);
    });

    it('sorts authors by commit count descending', () => {
      const commits = [
        makeCommit('bob'),
        makeCommit('alice'),
        makeCommit('alice'),
        makeCommit('alice')
      ];
      const result = analyzeContributors(commits, []);
      expect(result.authors[0].name).toBe('alice');
      expect(result.authors[0].commits).toBe(3);
      expect(result.authors[1].name).toBe('bob');
    });

    it('computes percentage correctly', () => {
      const commits = [
        makeCommit('alice'),
        makeCommit('alice'),
        makeCommit('alice'),
        makeCommit('bob')
      ];
      const result = analyzeContributors(commits, []);
      expect(result.authors[0].percentage).toBe(75);
      expect(result.authors[1].percentage).toBe(25);
    });

    it('estimates additions and deletions proportionally', () => {
      const commits = [
        makeCommit('alice'),
        makeCommit('alice'),
        makeCommit('bob')
      ];
      const files = [makeFile('src/app.js', 30, 15)];
      const result = analyzeContributors(commits, files);
      // alice has 2/3 of commits → ~20 additions, ~10 deletions
      expect(result.authors[0].estimatedAdditions).toBe(20);
      expect(result.authors[0].estimatedDeletions).toBe(10);
    });

    it('builds activity timeline by day', () => {
      const commits = [
        makeCommit('alice', '2024-01-15T10:00:00Z'),
        makeCommit('alice', '2024-01-15T14:00:00Z'),
        makeCommit('bob', '2024-01-16T10:00:00Z')
      ];
      const result = analyzeContributors(commits, []);
      expect(result.activityTimeline).toHaveLength(2);
      expect(result.activityTimeline[0].date).toBe('2024-01-15');
      expect(result.activityTimeline[0].total).toBe(2);
      expect(result.activityTimeline[1].date).toBe('2024-01-16');
      expect(result.activityTimeline[1].total).toBe(1);
    });

    it('sorts timeline chronologically', () => {
      const commits = [
        makeCommit('alice', '2024-01-20T10:00:00Z'),
        makeCommit('alice', '2024-01-10T10:00:00Z'),
        makeCommit('alice', '2024-01-15T10:00:00Z')
      ];
      const result = analyzeContributors(commits, []);
      const dates = result.activityTimeline.map(t => t.date);
      expect(dates).toEqual(['2024-01-10', '2024-01-15', '2024-01-20']);
    });

    it('computes file ownership', () => {
      const commits = [makeCommit('alice')];
      const files = [makeFile('src/app.js'), makeFile('src/utils.js')];
      const result = analyzeContributors(commits, files);
      expect(Object.keys(result.fileOwnership)).toHaveLength(2);
      expect(result.fileOwnership['src/app.js'].likelyOwner).toBe('alice');
    });

    it('identifies top contributor in summary', () => {
      const commits = [
        makeCommit('alice'),
        makeCommit('alice'),
        makeCommit('bob')
      ];
      const result = analyzeContributors(commits, []);
      expect(result.summary.topContributor.name).toBe('alice');
    });

    it('computes active days', () => {
      const commits = [
        makeCommit('alice', '2024-01-15T10:00:00Z'),
        makeCommit('alice', '2024-01-17T10:00:00Z'),
        makeCommit('alice', '2024-01-20T10:00:00Z')
      ];
      const result = analyzeContributors(commits, []);
      expect(result.summary.activeDays).toBe(3);
    });

    it('computes average commits per day', () => {
      const commits = [
        makeCommit('alice', '2024-01-15T10:00:00Z'),
        makeCommit('alice', '2024-01-15T14:00:00Z'),
        makeCommit('alice', '2024-01-16T10:00:00Z')
      ];
      const result = analyzeContributors(commits, []);
      // 3 commits / 2 days = 1.5
      expect(result.summary.avgCommitsPerDay).toBe(1.5);
    });

    it('handles unknown author gracefully', () => {
      const commits = [{ sha: 'abc', shortSha: 'abc', message: 'test', date: '2024-01-15T10:00:00Z' }];
      const result = analyzeContributors(commits, []);
      expect(result.authors[0].name).toBe('Unknown');
    });

    it('tracks by-author breakdown in timeline', () => {
      const commits = [
        makeCommit('alice', '2024-01-15T10:00:00Z'),
        makeCommit('bob', '2024-01-15T14:00:00Z')
      ];
      const result = analyzeContributors(commits, []);
      const day = result.activityTimeline[0];
      expect(day.byAuthor.alice).toBe(1);
      expect(day.byAuthor.bob).toBe(1);
    });
  });
});
