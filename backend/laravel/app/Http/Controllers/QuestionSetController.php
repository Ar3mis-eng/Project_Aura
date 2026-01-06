<?php

namespace App\Http\Controllers;

use App\Models\QuestionSet;
use Illuminate\Http\Request;

class QuestionSetController extends Controller
{
    public function index(Request $request)
    {
        $sets = QuestionSet::where('is_active', true)->orderBy('key')->get();
        return response()->json($sets);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'key' => 'required|string|max:100|unique:question_sets,key',
            'title' => 'nullable|string|max:255',
            'schema' => 'required|array',
        ]);
        $set = QuestionSet::create([
            'key' => $data['key'],
            'title' => $data['title'] ?? null,
            'schema' => $data['schema'],
            'created_by' => $user->id,
            'is_active' => true,
        ]);
        return response()->json($set, 201);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $set = QuestionSet::findOrFail($id);
        $set->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
