<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\QuestionSet;

class ResetDatabaseForTesting extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:reset-for-testing';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset database but preserve 2 teacher accounts and question sets';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->confirm('This will delete all data except 2 teacher accounts and question sets. Continue?')) {
            $this->info('Reset cancelled.');
            return;
        }

        $this->info('Starting database reset...');

        try {
            DB::beginTransaction();

            // Get the teacher emails to preserve
            $teacherEmails = ['johnronan@teacher.com', 'marytaylor@teacher.com'];
            
            // Get teacher IDs
            $teacherIds = User::whereIn('email', $teacherEmails)
                ->where('role', 'teacher')
                ->pluck('id')
                ->toArray();

            if (count($teacherIds) !== 2) {
                $this->error('Could not find both teacher accounts!');
                DB::rollBack();
                return 1;
            }

            $this->info('Found teacher accounts: ' . implode(', ', $teacherEmails));

            // Store question sets data
            $questionSetsData = QuestionSet::all()->map(function ($qs) {
                return [
                    'key' => $qs->key,
                    'title' => $qs->title,
                    'schema' => $qs->schema,
                    'created_by' => $qs->created_by,
                    'is_active' => $qs->is_active,
                ];
            })->toArray();

            $this->info('Backed up ' . count($questionSetsData) . ' question sets.');

            // Delete data in reverse order of dependencies
            
            // 1. Delete messages
            $deletedMessages = DB::table('messages')->delete();
            $this->info("Deleted {$deletedMessages} messages");

            // 2. Delete thread participants
            $deletedParticipants = DB::table('thread_participants')->delete();
            $this->info("Deleted {$deletedParticipants} thread participants");

            // 3. Delete threads
            $deletedThreads = DB::table('threads')->delete();
            $this->info("Deleted {$deletedThreads} threads");

            // 4. Delete reports
            $deletedReports = DB::table('reports')->delete();
            $this->info("Deleted {$deletedReports} reports");

            // 5. Delete message reads if table exists
            if (DB::getSchemaBuilder()->hasTable('message_reads')) {
                $deletedReads = DB::table('message_reads')->delete();
                $this->info("Deleted {$deletedReads} message reads");
            }

            // 6. Delete question sets (we'll recreate them)
            $deletedQuestionSets = DB::table('question_sets')->delete();
            $this->info("Deleted {$deletedQuestionSets} question sets");

            // 7. Delete all users except the 2 teachers
            $deletedUsers = User::whereNotIn('id', $teacherIds)->delete();
            $this->info("Deleted {$deletedUsers} users (kept 2 teachers)");

            // 8. Reset login count for teachers
            User::whereIn('id', $teacherIds)->update(['login_count' => 0]);
            $this->info("Reset login counts for teachers");

            // 9. Recreate question sets
            foreach ($questionSetsData as $qsData) {
                QuestionSet::create($qsData);
            }
            $this->info("Restored " . count($questionSetsData) . " question sets");

            DB::commit();

            $this->info('');
            $this->info('✓ Database reset completed successfully!');
            $this->info('  - Preserved 2 teacher accounts');
            $this->info('  - Preserved ' . count($questionSetsData) . ' question sets');
            $this->info('  - Deleted all other data');

            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error during reset: ' . $e->getMessage());
            return 1;
        }
    }
}
