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

        // Gender breakdown for students
        $studentMale = User::where('role', 'student')->where('gender', 'male')->count();
        $studentFemale = User::where('role', 'student')->where('gender', 'female')->count();
        $studentOther = User::where('role', 'student')
            ->where(function($q){
                $q->whereNull('gender')->orWhereNotIn('gender', ['male','female']);
            })->count();

        // Gender breakdown for teachers/counselors/admins
        $teacherMale = User::whereIn('role', ['teacher','counselor','admin'])->where('gender', 'male')->count();
        $teacherFemale = User::whereIn('role', ['teacher','counselor','admin'])->where('gender', 'female')->count();
        $teacherOther = User::whereIn('role', ['teacher','counselor','admin'])
            ->where(function($q){
                $q->whereNull('gender')->orWhereNotIn('gender', ['male','female']);
            })->count();

        // Build per-type report counts with student gender breakdown (global across all reports)
        $reports = Report::with('student:id,gender')->get();
        $typeCounts = [];
        foreach ($reports as $r) {
            $rtype = $r->type ?? 'Unspecified';
            if (!isset($typeCounts[$rtype])) {
                $typeCounts[$rtype] = ['count' => 0, 'male' => 0, 'female' => 0, 'other' => 0];
            }
            $typeCounts[$rtype]['count']++;
            $g = strtolower(trim($r->student->gender ?? ''));
            if ($g === 'male') $typeCounts[$rtype]['male']++;
            else if ($g === 'female') $typeCounts[$rtype]['female']++;
            else $typeCounts[$rtype]['other']++;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_students' => $totalStudents,
                'total_teachers' => $totalTeachers,
                'total_reports' => $totalReports,
                'total_logins' => $totalLogins ?? 0,
                'student_genders' => ['male' => $studentMale, 'female' => $studentFemale, 'other' => $studentOther],
                'teacher_genders' => ['male' => $teacherMale, 'female' => $teacherFemale, 'other' => $teacherOther],
                'reports_by_type' => $typeCounts,
            ]
        ]);
    }
}
