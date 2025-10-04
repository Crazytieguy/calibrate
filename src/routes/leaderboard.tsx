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
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
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
          <div className="p-8 bg-base-200 rounded-lg text-center">
            <p className="opacity-70">
              No users on the leaderboard yet. Start forecasting!
            </p>
          </div>
        </div>
      ) : (
        <div className="not-prose">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Clips</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={entry.rank <= 3 ? "bg-base-200" : ""}
                  >
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
