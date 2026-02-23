<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Only attempt updates if the gender column exists
        if (Schema::hasColumn('users', 'gender')) {
            // Set gender for demo teachers by email
            DB::table('users')->where('email', 'johnronan@teacher.com')->update(['gender' => 'male']);
            DB::table('users')->where('email', 'chin.balahim@deped.gov.ph')->update(['gender' => 'female']);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'gender')) {
            // Revert to null
            DB::table('users')->where('email', 'johnronan@teacher.com')->update(['gender' => null]);
            DB::table('users')->where('email', 'chin.balahim@deped.gov.ph')->update(['gender' => null]);
        }
    }
};
