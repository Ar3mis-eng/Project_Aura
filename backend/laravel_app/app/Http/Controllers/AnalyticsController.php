<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Report;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        // Total students
        $totalStudents = User::where('role', 'student')->count();

        // Total teachers (including counselors and admins)
        $totalTeachers = User::whereIn('role', ['teacher', 'counselor', 'admin'])->count();

        // Total reports submitted
        $totalReports = Report::count();

        // Total app usage (login count)
        // Sum up login_count from all users
        $totalLogins = User::sum('login_count');

        return response()->json([
            'success' => true,
            'data' => [
                'total_students' => $totalStudents,
                'total_teachers' => $totalTeachers,
                'total_reports' => $totalReports,
                'total_logins' => $totalLogins ?? 0,
            ]
        ]);
    }
}
