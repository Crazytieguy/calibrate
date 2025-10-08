import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Medal, Award } from "lucide-react";
import { api } from "../../convex/_generated/api";

const leaderboardQueryOptions = convexQuery(api.users.getLeaderboard, {});

export const Route = createFileRoute("/leaderboard")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(leaderboardQueryOptions);
    }
  },
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: leaderboard } = useSuspenseQuery(leaderboardQueryOptions);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-warning" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-base-content/50" />;
    if (rank === 3) return <Award className="w-6 h-6 text-accent" />;
    return null;
  };

  return (
    <>
      <div className="not-prose mb-6">
        <h1 className="mt-0">Leaderboard</h1>
        <p className="opacity-70">Top forecasters ranked by clips earned</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="not-prose">
          <div className="flex flex-col items-center justify-center py-16 px-8 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No rankings yet</h2>
            <p className="text-base-content/70 text-center max-w-md">
              The leaderboard will populate as users make forecasts and earn clips. Be the first to climb the ranks!
            </p>
          </div>
        </div>
      ) : (
        <div className="not-prose">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Clips</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} className="hover">
                    <td>
                      <div className="flex items-center gap-2">
                        {getRankIcon(entry.rank)}
                        <span className="font-bold">#{entry.rank}</span>
                      </div>
                    </td>
                    <td className="font-medium">{entry.name}</td>
                    <td>
                      <span className="font-bold">{entry.clips} 📎</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
