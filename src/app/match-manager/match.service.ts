import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Tournament {
  id: string;
  name: string;
}

export interface MatchSummary {
  id: number;
  matchId: string;
  venue?: string;
  teams?: string[]; 
   jsonData: string;
  info?: {
    venue?: string;
    teams?: string[];
    [key: string]: any;     // allow other nested properties
  };
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  // private baseUrl = 'http://localhost:5017/api/Match';  // Match controller route casing
  // private baseUrl = 'https://cric-analyst-backend.onrender.com/api/match';
  private baseUrl = 'https://cric-analyst-dotnet.onrender.com/api/match';
    // private folderUrl = 'http://localhost:3000/api';


  constructor(private http: HttpClient) {}

  uploadMatches(formData: FormData): Observable<any> {
return this.http.post(`${this.baseUrl}/upload`, formData);  }

  getTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.baseUrl}/tournaments`);
  }

//   getAllMatches(tournamentName: string): Observable<MatchSummary[]> {
//   return this.http.get<MatchSummary[]>(`/api/matches/${tournamentName}/all`);
// }

getAllMatches(tournamentName: string): Observable<MatchSummary[]> {
  return this.http.get<MatchSummary[]>(`${this.baseUrl}/matches/${tournamentName}/all`);
}


  getYears(tournamentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/years/${encodeURIComponent(tournamentId)}`);
  }

  getMatches(tournamentId: string, year: number): Observable<MatchSummary[]> {
    return this.http.get<MatchSummary[]>(`${this.baseUrl}/matches/${encodeURIComponent(tournamentId)}/${year}`);
  }

  getMatchDetails(matchId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/match/${matchId}`);
  }
}
