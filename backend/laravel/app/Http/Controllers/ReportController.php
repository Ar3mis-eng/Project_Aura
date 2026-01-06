<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'teacher' || $user->role === 'admin') {
            $reports = Report::with('student:id,first_name,last_name,email')->orderByDesc('submitted_at')->paginate(20);
        } else {
            $reports = Report::where('student_id', $user->id)->orderByDesc('submitted_at')->paginate(20);
        }
        return response()->json($reports);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'type' => ['required','string','max:50'],
            'answers' => ['required','array'],
        ]);

        $report = Report::create([
            'student_id' => $user->id,
            'type' => $data['type'],
            'answers' => $data['answers'],
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return response()->json($report->fresh(), 201);
    }

    public function show(Request $request, $id)
    {
        $report = Report::with('student:id,first_name,last_name,email')->findOrFail($id);
        $user = $request->user();
        if ($user->role === 'teacher' || $user->role === 'admin' || $report->student_id === $user->id) {
            return response()->json($report);
        }
        return response()->json(['message' => 'Forbidden'], 403);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $report = Report::findOrFail($id);
        $report->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
