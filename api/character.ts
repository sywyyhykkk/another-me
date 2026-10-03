import type {
	ApiResponse,
	CharacterSuggestion,
	SuggestCharacterPayload
} from '../types/virtualProfile'
import { requestApi } from '../utils/request'

export function suggestCharacter(payload: SuggestCharacterPayload) {
	return requestApi<ApiResponse<CharacterSuggestion>>('/characters/suggest', 'POST', payload)
}
